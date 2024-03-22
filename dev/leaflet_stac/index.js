// Initialize the Leaflet map
var map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// URL to your locally hosted STAC catalog
var stac_url = "../results_STAC/catalog.json";

// Define the source projection (replace with the actual projection of your data)
const sourceProjection = "EPSG:3979";
// WGS84 projection
const destProjection = "EPSG:4326";

proj4.defs(
  "EPSG:3979",
  "+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=-0.991,1.9072,0.5129,-1.25033e-07,-4.6785e-08,-5.6529e-08,0 +units=m +no_defs +type=crs"
);

// Fetching the STAC catalog
fetch(stac_url)
  .then((response) => {
    console.log(response);
    return response.json();
  })
  .then((stac_catalog) => {
    // Accessing collections
    const collection_links = stac_catalog.links.filter(
      (link) => link.rel === "child"
    );
    collection_links.forEach((collection_link) => {
      const collection_url = "../results_STAC/my_collection/collection.json";
      // Fetching collection JSON
      fetch(collection_url)
        .then((response) => response.json())
        .then((collection_json) => {
          // Accessing items in the collection
          collection_json.links.forEach((item_link) => {
            if (item_link.rel === "item") {
              // Construct the URL to the item
              const item_url =
                "../results_STAC/my_collection/s4_12710_6725_20060726_m20_1_lcc00_cog.tif/s4_12710_6725_20060726_m20_1_lcc00_cog.tif.json";
              // Fetching item JSON
              fetch(item_url)
                .then((response) => response.json())
                .then((item_json) => {
                  // Accessing geometry of the item and adding it to the map
                  const geometry = item_json.geometry;

                  geometry.coordinates[0] = geometry.coordinates[0].map(
                    (coord) => proj4(sourceProjection, destProjection, coord)
                  );

                  console.log(geometry);
                  L.geoJSON(geometry).addTo(map);
                  map.fitBounds(L.geoJSON(geometry).getBounds());
                });
            }
          });
        });
    });
  });
