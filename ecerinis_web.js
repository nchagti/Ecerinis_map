$(function () {
  console.log("Ecerinis page ready!");
  
  /* ===================
     MAP INITIALIZATION
  ====================== */

  // 1. Create the map object and set the initial view

  const map = L.map("map").setView([47.57, 8.53], 4);

  // 2. Add a tile layer (the base map image) using OpenStreetMap tiles

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, // Max zoom level for these tiles
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  console.log("Map initialized.");

  /* ===================
         CONSTANTS
  ====================== */

  const resetZoom = $("#resetZoom"); // button in Event Listeners section
  const toggleAll = $("#toggleAll"); // button in Event Listeners section
  
  //Define manuscript family relationships for filtering logic
  const familyChildren = { // principle branches
                           x:['y','y1','alpha','beta','gamma','gamma1','delta','epsilon','zeta','eta'],
                           y:['y1'], 
                           // Sub-families with superscripts
                           gamma:['gamma1'] };

  // Global state that other functions read
  const allMarkers = []; //make sure to declare outside the loop, so not resetting the array every time
  let activeFamilies = [];

  /* ====================
      MANUSCRIPT HELPERS
  ====================== */

  // Written with traditional function syntax:
  /* 
    const fmtNotation = function (o) {
      if (o && o.base) {              //check that o exists and has a .base property
        if (o.superscript) {          //check if it has a .superscript property
          return `${o.base}<sup>${o.superscript}</sup>`; //if so, return base with superscript
        } else {                     
          return o.base;               //if no superscript, return just the base
        }
      }
      return null;                 //if o doesn't exist or has no .base, return null
    }; */

    const fmtNotation = (o) =>
    o && o.base ? (o.superscript ? `${o.base}<sup>${o.superscript}</sup>` : o.base) : null; //uses ternary operators (condition ? value if true : value if false) 

    const rawData = (o) =>
      o && o.base ? (o.superscript ? `${o.base}${o.superscript}` : o.base) : null; //similar to fmtNotation, but returns raw data without HTML formatting
  
  /* ====================
      LOAD MANUSCRIPT DATA
      AND CREATE MARKERS
  ====================== */

  $.getJSON("ecerinis_manuscripts.json", function (data) {
    console.log(`Manuscripts data loaded: ${data}`);
    console.log(data.manuscripts);

    data.manuscripts.forEach(function (manuscript) {
      // Create strings for display and filtering for families and derivedFro, using the notation formatting function

      const familiesDisplay = (Array.isArray(manuscript.families) ? manuscript.families : []) //checks if manuscript.families is an array; if not, uses empty array
        .map(fmtNotation).filter(Boolean);  //applies fmtNotation to each element, then filters out any null/undefined values

      const familiesRaw = (Array.isArray(manuscript.families) ? manuscript.families : [])
        .map(rawData).filter(Boolean); //instead of fmtNotation, keeps only the raw info, used for filtering logic

      const derivedFromDisplay = (Array.isArray(manuscript.derivedFrom) ? manuscript.derivedFrom : []) //checks if manuscript.derivedFrom is an array; if not, uses empty array
        .map(fmtNotation).filter(Boolean);  //applies fmtNotation to each element, then filters out any null/undefined values

      const notation = (manuscript.notation && manuscript.notation.base) ? (manuscript.notation.superscript ? `${manuscript.notation.base}<sup>${manuscript.notation.superscript}</sup>` : manuscript.notation.base) : "";

      
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
      
      // Create the marker and attach metadata for filtering
      const manuscriptMarker = L.marker(manuscriptCoords); //The L.marker() function returns an object + can attach custom properties to objects (like .families or .notation). Makes it easy to filter markers by checking for, e.g., marker.families.includes('α')
      manuscriptMarker.families = familiesRaw; //Attach metadata to marker
      manuscriptMarker.notation = notation; //Attach metadata to marker
      manuscriptMarker.derivedFrom = derivedFromDisplay; //Attach metadata to marker
      allMarkers.push(manuscriptMarker); //Add marker to global array for filtering later

      // Create popup content with conditional lines for families and derivedFrom
      const popupMessage = `<b>Name:</b> ${manuscriptName}<br> 
            <b>Manuscript Number:</b> ${manuscriptNumber} <br>
            <b>Date:</b> ${date} <br>
            <b>Holding Institution:</b> ${institution} <br>
            <b>Institution City:</b> ${institutionCity} <br>
            <b>Manuscript Notation:</b> ${notation} <br>
            ${familiesDisplay.length ? `<b>Manuscript Families:</b> ${familiesDisplay.join(", ")}<br>` : ""}
            ${derivedFromDisplay.length ? `<b>Derived From:</b> ${derivedFromDisplay.join(", ")}` : ""}`; //only includes manuscript families and derivations if non-empty

      manuscriptMarker.addTo(map).bindPopup(popupMessage);
    });


  /* ====================
         HELPERS
  ====================== */

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

    function uncheckDescendants(node) {
      // node is the actual <input type="checkbox"> element
      const id = node.id;

      // A) uncheck THIS node
      $(node).prop('checked', false);

      // B) get my immediate children, if any
      const kids = familyChildren[id] || [];

      // C) recursively uncheck each child
      for (const kidId of kids) {
        const child = document.getElementById(kidId);
        if (child) uncheckDescendants(child);
      }
    }

    function checkDescendants(node) {
      const id = node.id;

      // A) check THIS node
      $(node).prop('checked', true);

      // B) recurse into immediate children
      const kids = familyChildren[id] || [];
      for (const kidId of kids) {
        const child = document.getElementById(kidId);
        if (child) checkDescendants(child);
      }
    }

  /* ====================
        UPDATE STATE
  ====================== */
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
  
  /* ====================
     EVENT HANDLING
  ====================== */

    // Reset Zoom event
    resetZoom.click(function () {
    console.log(`Reset Zoom button was clicked!`);
    map.setView([47.57, 8.53], 4);
    });


    // Toggle All event
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

    // Checkbox recursion event
    $('#familyFilter').on('change', 'input[type="checkbox"]', function () {
      if (this.checked) {
        // If I turn a parent ON, turn all my descendants ON
        checkDescendants(this);
      } else {
        // If I turn a parent OFF, turn all my descendants OFF
        uncheckDescendants(this);
      }
      // Now rebuild activeFamilies and refresh markers + "Select All" label
      updateAll();
    });


  /* ====================
      INITIALIZE STATE
  ====================== */
  //When the page loads, populate activeFamilies with all the initially checked families
    $('#familyFilter input[type="checkbox"]:checked').each(function () {
      activeFamilies.push($(this).val());
    });

    console.log(activeFamilies);
    updateVisibleMarkers();

  }); //end of $.getJSON
});
