<template>
    <div id = "map">
    </div>
</template>
 
<script>
import { Map, View } from 'ol';
import { Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import STACLayer from 'ol-stac';
import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';

register(proj4);
 
export default {
    name: 'Map',
    mounted() {
    const stac = new STACLayer({
        url: 'https://s3.us-west-2.amazonaws.com/sentinel-cogs/sentinel-s2-l2a-cogs/10/T/ES/2022/7/S2A_10TES_20220726_0_L2A/S2A_10TES_20220726_0_L2A.json',
    });

    this.map = new Map({
        target: 'map',
        layers: [
            new TileLayer({
                source: new OSM()
            }),
            stac
        ],
        view: new View({
            center: [0, 0],
            zoom: 2
        })
    });

    stac.on('sourceready', () => {
        this.map.getView().fit(stac.getExtent());
    });
}
}
</script>