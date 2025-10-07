$(function () {
  console.log("Ecerinis page ready!");
  const map = L.map("map").setView([56.79905363342418, 13.808172660007736], 3);

  // 2. Add a tile layer (the base map image)
  // Using OpenStreetMap tiles

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, // Max zoom level for these tiles
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  console.log("Map initialized.");

  const resetZoom = $("#resetZoom");
  resetZoom.click(function () {
    console.log(`Reset Zoom button was clicked!`);
    map.setView([56.79905363342418, 13.808172660007736], 3);
  });

  const allMarkers = []; //make sure to declare outside the loop, so not resetting the array every time
  let activeFamilies = [];
  $.getJSON("ecerinis_manuscripts.json", function (data) {
    console.log(`Manuscripts data loaded: ${data}`);
    console.log(data.manuscripts);

    data.manuscripts.forEach(function (manuscript) {
      let manuscriptCoords = [];
      if (manuscript.coordinates) {
        manuscriptCoords = manuscript.coordinates;
      } else {
        console.log(`Error: No coordinates found.`);
      }
      let manuscriptName = "";
      if (manuscript.name) {
        manuscriptName = manuscript.name;
      } else {
        console.log(`Error: No manuscript name found.`);
      }
      let manuscriptNumber = "";
      if (manuscript.number) {
        manuscriptNumber = manuscript.number;
      } else {
        console.log(`Error: No manuscript number found.`);
      }
      let date = "";
      if (manuscript.date) {
        date = manuscript.date;
      } else {
        console.log(`Error: No manuscript date found.`);
      }
      let institution = "";
      if (manuscript.institution) {
        institution = manuscript.institution;
      } else {
        console.log(`Error: No holding institution found.`);
      }
      let institutionCity = "";
      if (manuscript.institutionCity) {
        institutionCity = manuscript.institutionCity;
      } else {
        console.log(`Error: No institution city found.`);
      }
      let notation = "";
      if (
        manuscript.notation &&
        manuscript.notation.base &&
        manuscript.notation.superscript
      ) {
        notation = `${manuscript.notation.base}<sup>${manuscript.notation.superscript}</sup>`;
      } else if (manuscript.notation && manuscript.notation.base) {
        notation = manuscript.notation.base;
      } else {
        console.log(`Error: No notation found.`);
      }
      let families = [];
      if (manuscript.families) {
        families = manuscript.families;
      } else {
        console.log(`Error: No families found.`);
      }

      const manuscriptMarker = L.marker(manuscriptCoords);
      //The L.marker() function returns an object + can attach custom properties to objects (like .families or .notation). Makes it easy to filter markers by checking for, e.g., marker.families.includes('α')
      manuscriptMarker.families = families; //Attach metadata to marker
      manuscriptMarker.notation = notation; //Attach metadata to marker

      allMarkers.push(manuscriptMarker);

      popupMessage = `<b>Name:</b> ${manuscriptName}<br> 
            <b>Manuscript Number:</b> ${manuscriptNumber} <br>
            <b>Date:</b> ${date} <br>
            <b>Holding Institution:</b> ${institution} <br>
            <b>Institution City:</b> ${institutionCity} <br>
            <b>Manuscript Notation:</b> ${notation} <br>
            <b>Manuscript Families:</b> ${families} <br>`;

      manuscriptMarker.addTo(map).bindPopup(popupMessage);
    });
    function updateVisibleMarkers() {
      allMarkers.forEach(function (marker) {
        let showMarker = false;
        for (let family of marker.families) {
          if (activeFamilies.includes(family)) {
            showMarker = true;
            break;
          }
          // else {
          //     console.log(`Error showing family marker`)
          // }
        }
        if (showMarker) {
          marker.addTo(map);
        } else {
          map.removeLayer(marker);
        }
      });
    }

    function updateAll() {
      // clear the array
      activeFamilies = [];
      // Loop through all checked boxes and get an array of families
      $('#familyFilter input[type="checkbox"]:checked').each(function () {
        activeFamilies.push($(this).val());
      });
      console.log(activeFamilies);
      updateVisibleMarkers();
      total = $('#familyFilter input[type="checkbox"]').length; //after users interact with the check boxes, i need fresh info about how many are checked
      checked = $('#familyFilter input[type="checkbox"]:checked').length;
      if (checked === total) {
        toggleAll.text("Deselect All");
      } else {
        toggleAll.text("Select All");
      }
    }

    //When the page loads, populate activeFamilies with all the initially checked families
    $('#familyFilter input[type="checkbox"]:checked').each(function () {
      activeFamilies.push($(this).val());
    });
    console.log(activeFamilies);
    updateVisibleMarkers();

    const toggleAll = $("#toggleAll");

    toggleAll.click(function () {
      console.log("Toggle button was clicked!");
      checkboxes = $('#familyFilter input[type="checkbox"]'); //count how many checkboxes there are
      var all_checked = true;
      for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].checked) {
          all_checked = false;
          break;
        }
      }
      for (var j = 0; j < checkboxes.length; j++) {
        checkboxes[j].checked = !all_checked;
      }
      updateAll();
    });
    $('#familyFilter input[type="checkbox"]').change(function () {
      updateAll();
    });
  });
  //end of $.getJSON
});
