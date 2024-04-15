<template>
    <div id="aaa">
        <div class="app" id="app">
            <div class="app-header">
                <input type="file" id="file-selector">
                <input type="range" min="0" max="1" step="0.01" value="0.2" id="sliderOpacity">

                <div class="nomenclature-container" id="nomenclature">
                    <input type="file" id="csv-input" accept=".csv">
                    <div id="class-buttons"></div>
                </div>

                <button id="btnExport">exporter</button>
                <button id="vectorize">vectorize</button>

            </div>

            <div id="buttonCreation">
                <form id="buttonForm">
                    <label for="textContent">Texte:</label>
                    <input type="text" id="textContent" name="textContent">
                    <label for="buttonColor">Couleur:</label>
                    <input type="color" id="buttonColor" name="buttonColor">
                    <button type="submit">Créer Bouton</button>
                </form>
            </div>

            <div class="app-body">
                <div class="slide-container">
                    <input type="range" min="0" max="1" value="0" step="any" class="slider" id="slider" list="markers">
                    <div class="slider-values">
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                        <div class="slider-value"></div>
                    </div>
                </div>
                <div class="canvas-container">
                    <canvas class="canvas" id="canvas"></canvas>
                    <canvas class="canvas" id="canvasVector"></canvas>
                </div>
            </div>
        </div>


    </div>
</template>

<script>


export default {
    name: 'labellisationView'
};

</script>


<style scoped>
#aaa {
    position: absolute;
    top: 5vh;
    left: 0;

    width: 100vw;
    height: 95vh;
}

.app {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.app-header {
    padding: 16px;
}

.app-body {
    min-height: 0;
    flex-grow: 1;
    display: flex;
    flex-direction: row;


}

input[type=range] {
    -webkit-appearance: slider-vertical;
    -moz-appearance: slider-vertical;
    width: 16px;
    height: 100%;
    outline: none;
    background: transparent;
}

.slide-container {
    padding: 24px 16px 24px 16px;
    background-color: white;
    display: flex;
    flex-direction: row;
}

.slider-values {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-left: 4px;
}

.slider-value {
    font-size: 12px;
    text-align: center;
}

.canvas-container {
    /* width: auto;
    height: auto; */
    aspect-ratio: auto;
    display: flex;
    justify-content: center;
    background-color: black;

    position: relative;

}

.canvas {

    background-color: black;
    object-fit: contain;
    image-rendering: pixelated;

    position: absolute;
    top: 0;
    left: 0;
}

#canvasVector {

    /* background-color: red; */
}

#sliderOpacity {
    width: 100px;
    -webkit-appearance: none;
    appearance: none;
    height: 10px;
    background: #d3d3d3;
    outline: none;
    opacity: 0.7;
    -webkit-transition: .2s;
    transition: opacity .2s;
    border-radius: 5px;
}

#sliderOpacity:hover {
    opacity: 1;
}

#sliderOpacity::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #4CAF50;
    cursor: pointer;
    border-radius: 50%;
}

#sliderOpacity::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #4CAF50;
    cursor: pointer;
    border-radius: 50%;
}

#class-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 20px;
}

#class-buttons button {
    padding: 5px 10px;
    font-size: 10px;
    border: solid 1px black;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
}
</style>
