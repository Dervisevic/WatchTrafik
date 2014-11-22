var UI = require('ui');
var ajax = require('ajax');
var lat = "";
var long = "";

function getLocation() {
  navigator.geolocation.getCurrentPosition(function(position) { 
    lat  = position.coords.latitude;
    long = position.coords.longitude;
  }, function(error) { 
    var gpsError = new UI.Card({
      title: 'Error fetching GPS',
      subtitle: 'Please try again.'
    });
    gpsError.show();
    console.log("Could not get GPS location.");
  }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 } );
}

function replaceLetters(input) {
  var fixed = input.replace(/ä/g, "a")
                   .replace(/ö/g, "o")
                   .replace(/Ä/g, "A")
                   .replace(/Ö/g, "O")
                   .replace(/Ä/g, "A")
                   .replace(/ä/g, "a")
                   .replace(/å/g, "a")
                   .replace(/Å/g, "A")
                   .replace(/é/g, "e")
                   .replace(/É/g, "E")
                   .replace(/[^\000-\177]/g, "");
  return fixed;
}

//Entry
getLocation();

request('location.nearbystops', {originCoordLong: long, originCoordLat: lat, maxDist: 3000}, function(data) {
  var stops = data.LocationList.StopLocation;
  var mainStops = stops.filter(function (el) {
    return typeof(el.track) === 'undefined';
  });
    var items = [];
  mainStops.forEach(function(stop) {
    items.push({
      title: replaceLetters(stop.name)
    });
  });
  var menu = new UI.Menu({
    sections: [{
      items: items
    }]
  });
  menu.show();
  menu.on('select', function(e) {
    var stop = mainStops[e.itemIndex];
    getDepartures(stop.id);
  });
});

function getDate() {
  var MyDate = new Date();
  return MyDate.getFullYear() + '-' + ('0' + (MyDate.getMonth()+1)).slice(-2) + '-' + ('0' + MyDate.getDate()).slice(-2);
}

function getTime() {
  var MyDate = new Date();
  return ('0' + MyDate.getHours()).slice(-2) + ":"+ ('0' + MyDate.getMinutes()).slice(-2);
}


function getDepartures(id) {
  request('departureBoard', {
    id: id,
    date: getDate(),
    time: getTime(),
    needJourneyDetail: 0,
    maxDeparturesPerLine: 2
  }, function(deps) {
    var items = [];
    deps.DepartureBoard.Departure.forEach(function(departure) {
      var direction = replaceLetters(departure.direction);
      var rtTime = new Date(departure.date + "T" + departure.rtTime);
      var diff = rtTime - new Date(); 
      var mins = Math.round((diff / 1000) / 60) + rtTime.getTimezoneOffset();
      if (mins < 0) { mins = 0; }
      items.push({
        title: departure.sname + " " + direction,
        subtitle: departure.track + " | " + mins + " min (" + departure.rtTime + ")"});
    });
    var menu = new UI.Menu({
      sections: [{
        items: items
      }]
    });
    menu.show();
  });
}

function serialize(obj, prefix) {
  var str = [];
  for(var p in obj) {
    var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
    str.push(typeof v == "object" ?
      serialize(v, k) :
      encodeURIComponent(k) + "=" + encodeURIComponent(v));
  }

  return str.join("&");
}

function request(method, inputData, callback) {
  inputData.authKey = '10dc1206-e851-48b5-8b84-69f49409b748';
  inputData.format = 'json';
  var query = serialize(inputData);
  ajax({
    url: 'http://api.vasttrafik.se/bin/rest.exe/' + method + '?' + query,
    type: 'json',
    method: 'get'
  },
  function(data) {
    console.log(data);
    callback(data);
  },
  function(error) {
    console.log('The ajax request failed: ' + error);
  }
);
}

