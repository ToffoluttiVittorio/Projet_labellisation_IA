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

### quels sont les liens entre front et la partie calcul ?
- dans /src/, on y trouve les fichiers écrits en Rust (.rs) (pour l'instant, pas nécessaire de comprendre)
- build l'application produit le code javascript qui réalise la segmentation, visible dans /pkg/
- le front /example/ utilise ensuite ces fonctions et montre le résultat segmenté dans le canvas
  pour cela, dans nod_modules, il y a un dossier appelé 'hierarchy_labellisation' qui est un lien vers /pkg/
  
![Capture d’écran du 2024-03-21 16-24-21](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/121936719/a23b7d75-93b0-421e-83c7-59a92d1e0f87)

### comment est appelé le calcul au sein du front ?

![seg drawio](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/121936719/7b9cf4d4-06a5-4889-9796-c3ec153f4a70)


