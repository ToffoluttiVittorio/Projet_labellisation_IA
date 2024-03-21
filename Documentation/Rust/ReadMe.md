# Calcul de Segmentation

## Installation 

```shell
git clone https://github.com/IGNF/hierarchy_labellisation/tree/main

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
npm install node
wasm-pack build
```
si problème à une étape, exit et restart le terminalet essayer ces commandes pour checker : 
```shell
rustup
wasm-pack
yarn
node -v
npm -v
```

```shell
cd example
yarn install
yarn dev
```

http://localhost:5173/

avoir un .tif :
https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography
image de 2 MB = 10s

## Compréhension

-> dans src/, on y trouve les fichiers écrits en Rust (.rs) (pour l'instant, pas nécessaire de comprendre)
-> build l'application produit le code javascript qui réalise la segmentation, visible dans pkg/
-> le front example/ utilise ensuite ces fonctions et montre le résultat segmenté dans le canvas






