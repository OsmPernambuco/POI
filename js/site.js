var findme_map = L.map('findme-map')
    .setView([37.7, -97.3], 3),
    osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    osmAttrib = 'Map data © OpenStreetMap contributors',
    osm = L.tileLayer(osmUrl, {minZoom: 2, maxZoom: 18, attribution: osmAttrib}).addTo(findme_map),
    category_data = [];

// Check if user is on business page or home/address page
var addr = location.pathname.match(/address/) ? true : false;

var findme_marker = L.marker([0,0], {draggable:true}).addTo(findme_map);
findme_marker.setOpacity(0);

if (location.hash) location.hash = '';

var successString,loadingText;

i18n.init({ fallbackLng: 'en-US', postAsync: 'false' }, function() {
    $("body").i18n();

    successString=i18n.t('messages.success', { escapeInterpolation: false });
    loadingText=i18n.t('messages.loadingText');

    var detectedLang = i18n.lng();
    var buildSelectControl = function(data) {
        $("#category").select2({data: data});
    };

    $.getJSON('./locales/' + detectedLang + '/categories.json', buildSelectControl).fail(function () {
        // 404? Fall back to en-US
         $.getJSON('./locales/en-US/categories.json', buildSelectControl);
    });
});

function zoom_to_point(chosen_place, map, marker) {
    console.log(chosen_place);

    marker.setOpacity(1);
    marker.setLatLng([chosen_place.lat, chosen_place.lon]);


    map.setView(chosen_place, 18, {animate: true});
}
$("#use_my_location").click(function (e) {
    $("#couldnt-find").hide();
    $("#success").hide();
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var point = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            }

            zoom_to_point(point, findme_map, findme_marker);

            $('#success').html(successString);
            $('#success').show();
            window.scrollTo(0, $('#address').position().top - 30);
            $('.step-2 a').attr('href', '#details');
        }, function (error) {
            $("#couldnt-find").show();
        });
    } else {
      $("#couldnt-find").show();
    }
});
$("#find").submit(function(e) {
    e.preventDefault();
    $("#couldnt-find").hide();
    $("#invalid-location").hide();
    $("#success").hide();
    var address_to_find = $("#address").val();
    if (address_to_find.length === 0) return;
    var qwarg = {
        format: 'json',
        q: address_to_find
    };
    var url = "https://nominatim.openstreetmap.org/search?" + $.param(qwarg);
    $("#findme h4").text(loadingText);
    $("#findme").addClass("loading");
    $.getJSON(url, function(data) {
        if (data.length > 0) {
            zoom_to_point(data[0], findme_map, findme_marker);

            $('#success').html(successString);
            $('#success').show();
            window.scrollTo(0, $('#address').position().top - 30);
            $('.step-2 a').attr('href', '#details');
        } else {
            $("#couldnt-find").show();
        }
        $("#findme").removeClass("loading");
    });
});

$(window).on('hashchange', function() {
    if (location.hash == '#details') {
        $('#collect-data-step').removeClass('hide');
        $('#address-step').addClass('hide');
        $('#confirm-step').addClass('hide');
        $('.steps').addClass('on-2');
        $('.steps').removeClass('on-3');
    } else if (location.hash == '#done') {
        $('#confirm-step').removeClass('hide');
        $('#collect-data-step').addClass('hide');
        $('#address-step').addClass('hide');
        $('.steps').addClass('on-3');
    } else {
        $('#address-step').removeClass('hide');
        $('#collect-data-step').addClass('hide');
        $('#confirm-step').addClass('hide');
        $('.steps').removeClass('on-2');
        $('.steps').removeClass('on-3');
    }
    findme_map.invalidateSize();
});

$("#collect-data-done").click(function() {
    location.hash = '#done';

    var note_body = !addr ? 
        "onosm.org submitted note from a business:\n" +
        "name: " + $("#name").val() + "\n" +
        "phone: " + $("#phone").val() + "\n" +
        "website: " + $("#website").val() + "\n" +
        "twitter: " + $("#twitter").val() + "\n" +
        "hours: " + $("#opening_hours").val() + "\n" +
        "category: " + $("#category").val() + "\n" +
        "address: " + $("#address").val() 
        : 
        "onosm.org submitted note for a home address:\n" + 
        "number: " + $("#number").val() + "\n" +
        "street: " + $("#street").val() + "\n" +
        "city: " + $("#city").val() + "\n" +
        "postal_code: " + $("#postal_code").val() + "\n",
        latlon = findme_marker.getLatLng(),
        note_data = {
            lat: latlon.lat,
            lon: latlon.lng,
            text: note_body
        };

    $.post(
        'https://api.openstreetmap.org/api/0.6/notes.json',
        note_data,
        function(result) {
            var id = result.properties.id;
            $("#linkcoords").append(
                '<a href="https://osm.org/note/' + id + '">https://osm.org/note/' + id + '</a>'
            );
        }
    );
});

function clearFields() {
    $("#name").val('');
    $("#phone").val('');
    $("#website").val('');
    $("#twitter").val('');
    $("#opening_hours").val('');
    $("#category").val('');
    $("#address").val('');
    $("#linkcoords").empty();
}

function check_coordinates() {
    var latlon = findme_marker.getLatLng();

    if ((latlon.lat != 0) || (latlon.lng != 0)) {
        location.hash = '#details';
    } else {
        $("#invalid-location").show();
    }
}
