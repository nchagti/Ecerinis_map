$(function () {
  console.log("Ecerinis page ready!");
  const map = L.map("map").setView([47.57, 8.53], 4);

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
    map.setView([47.57, 8.53], 4);
  });

  const allMarkers = []; //make sure to declare outside the loop, so not resetting the array every time
  let activeFamilies = [];
  $.getJSON("ecerinis_manuscripts.json", function (data) {
    console.log(`Manuscripts data loaded: ${data}`);
    console.log(data.manuscripts);

    // Define a helper function fmtNotation that takes one argument

    // Written with arrow function syntax:
    // const fmtNotation = (o) =>
    // o && o.base ? (o.superscript ? `${o.base}<sup>${o.superscript}</sup>` : o.base) : null;
    // uses ternary operators (condition ? value if true : value if false) so 
    //"o && o.base ? ... :null" checks: if o exists and has a property base, then does the first (inside) part. If o does not exist, returns null (the second part)
    //"o.superscript ? ... : ..." checks: if o has a property superscript (?), then does the first part (formats it), else (:) does the second part (returns just the base)

    // Written with traditional function syntax:

    const fmtNotation = function (o) {
      if (o && o.base) {              //check that o exists and has a .base property
        if (o.superscript) {          //check if it has a .superscript property
          return `${o.base}<sup>${o.superscript}</sup>`; //if so, return base with superscript
        } else {                     
          return o.base;               //if no superscript, return just the base
        }
      }
      return null;                 //if o doesn't exist or has no .base, return null
    };

    data.manuscripts.forEach(function (manuscript) {
      // Create strings for display and filtering for families and derivedFro, using the notation formatting function

      const familiesDisplay = (Array.isArray(manuscript.families) ? manuscript.families : []) //checks if manuscript.families is an array; if not, uses empty array
        .map(fmtNotation).filter(Boolean);  //applies fmtNotation to each element, then filters out any null/undefined values

      const familiesRaw = (Array.isArray(manuscript.families) ? manuscript.families : [])
      .map(o => o.base).filter(Boolean); //instead of fmtNotation, keeps only the raw base letters, used for filtering logic

      const derivedFromDisplay = (Array.isArray(manuscript.derivedFrom) ? manuscript.derivedFrom : []) //checks if manuscript.derivedFrom is an array; if not, uses empty array
        .map(fmtNotation).filter(Boolean);  //applies fmtNotation to each element, then filters out any null/undefined values

      // Diagnositcs: detect malformed entries

      const familiesInputCount = Array.isArray(manuscript.families) ? manuscript.families.length : 0;
      const familiesDropped = familiesInputCount - familiesDisplay.length;
      if (familiesDropped > 0) {
        console.warn(`Dropped ${familiesDropped} malformed families for manuscript ${manuscript.number || "(no number)"}.`);
      }


      // Extract other manuscript properties with error handling

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

      const manuscriptMarker = L.marker(manuscriptCoords);
      //The L.marker() function returns an object + can attach custom properties to objects (like .families or .notation). Makes it easy to filter markers by checking for, e.g., marker.families.includes('α')
      manuscriptMarker.families = familiesRaw; //Attach metadata to marker
      manuscriptMarker.notation = notation; //Attach metadata to marker
      manuscriptMarker.derivedFrom = derivedFromDisplay; //Attach metadata to marker

      allMarkers.push(manuscriptMarker);

      // Create popup content with conditional lines for families and derivedFrom

      let familiesLine = "";
      if (familiesDisplay.length > 0) {
        familiesLine = `<b>Manuscript Families:</b> ${familiesDisplay.join(", ")} <br>`;
      }

      let derivedFromLine = "";
      if (derivedFromDisplay.length > 0) {
        derivedFromLine = `<b>Derived From:</b> ${derivedFromDisplay.join(", ")}`;
      }

      const popupMessage = `<b>Name:</b> ${manuscriptName}<br> 
            <b>Manuscript Number:</b> ${manuscriptNumber} <br>
            <b>Date:</b> ${date} <br>
            <b>Holding Institution:</b> ${institution} <br>
            <b>Institution City:</b> ${institutionCity} <br>
            <b>Manuscript Notation:</b> ${notation} <br>
            ${familiesLine}
            ${derivedFromLine}`;      //only includes manuscript families and derivations if non-empty

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
      let total = $('#familyFilter input[type="checkbox"]').length; //after users interact with the check boxes, i need fresh info about how many are checked
      let checked = $('#familyFilter input[type="checkbox"]:checked').length;
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
      const checkboxes = $('#familyFilter input[type="checkbox"]'); //count how many checkboxes there are
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
