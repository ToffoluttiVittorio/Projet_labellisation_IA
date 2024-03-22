import os
from pystac import Catalog, Collection, Item, Asset, Extent, SpatialExtent, TemporalExtent
from pystac.extensions.eo import Band
import rasterio
from datetime import datetime, timezone
from shapely.geometry import box

# Get the absolute path of the script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
# Path to the folder containing the COGs
cog_folder = os.path.join(script_dir, 'cog_img')

# Initialize the STAC catalog
catalog = Catalog(id='my_catalog', description='My STAC Catalog')

# Create a collection in the catalog
extent = Extent(SpatialExtent([[-180, -90, 180, 90]]), TemporalExtent([[None, None]]))
collection = Collection(id='my_collection', description='My Collection', extent=extent)
catalog.add_child(collection)

# Loop through the COG files in the folder
for filename in os.listdir(cog_folder):
    if filename.endswith('.tif'):
        cog_path = os.path.join(cog_folder, filename)
        # Open the GeoTIFF with rasterio to extract the metadata
        with rasterio.open(cog_path) as src:
            bbox = list(src.bounds)
            geometry = box(*bbox)
            crs = src.crs.to_string()

        # Create a STAC Item for each COG
        item = Item(id=filename, 
                    geometry=geometry.__geo_interface__, 
                    bbox=bbox, 
                    datetime=datetime.utcnow(),
                    properties={})
        
        asset = Asset(href=cog_path, media_type='image/tiff; application=geotiff')
        item.add_asset(key='data', asset=asset)

        # Add the item to the collection
        collection.add_item(item)

# Set the self HREFs
catalog.normalize_hrefs('./results')

# Save the STAC catalog as a JSON file
catalog_file = './catalog.json'
catalog.describe()
catalog.save(catalog_file)