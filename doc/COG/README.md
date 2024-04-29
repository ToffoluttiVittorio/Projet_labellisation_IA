# COG : Cloud Optimized GeoTIFF

Un Cloud Optimized GeoTIFF (COG) est un fichier GeoTIFF normal, destiné à être hébergé sur un serveur de fichiers HTTP, avec une organisation interne qui permet des flux de travail plus efficaces sur le cloud.
Il découpe les images en tuiles et les rend accessibles via des adresses URL, ce qui permet une visualisation rapide et efficace des données.
COG ne se limite pas à la visualisation, mais rend également la manipulation des données plus efficace en permettant l'accès à des portions spécifiques de l'image sans avoir à télécharger l'ensemble du fichier.

## Efficacité de la récupération des données : 
 Lorsqu'une seule grande image est stockée, pour accéder à une portion spécifique de celle-ci, il est nécessaire de charger l'intégralité de l'image. Cela peut entraîner un gaspillage de bande passante et de ressources, surtout si seule une petite partie de l'image est nécessaire. En revanche, avec les tuiles, seules les tuiles pertinentes pour la visualisation sont chargées, ce qui réduit la quantité de données transférées et accélère le temps d'accès.
 
## Adaptation aux différents niveaux de zoom : 
Les images COG sont généralement organisées en plusieurs niveaux de résolution, ou niveaux de zoom. En stockant chaque niveau de zoom sous forme de tuiles distinctes, on peut optimiser l'accès aux données en fonction du niveau de zoom demandé. Par exemple, pour un zoom faible, les tuiles de basse résolution sont utilisées, tandis que pour un zoom élevé, des tuiles de haute résolution sont chargées. Cela permet une expérience utilisateur fluide et une consommation de ressources réduite.

## Gestion efficace des métadonnées : 
Diviser une grande image en tuiles permet également une gestion plus efficace des métadonnées associées à chaque tuile. Plutôt que d'avoir une seule ensemble de métadonnées pour toute l'image, chaque tuile peut avoir ses propres métadonnées spécifiques, ce qui facilite la gestion et la recherche des informations pertinentes.

## Génération d'un fichier COG à partir d'un GeoTIFF

### Installer GDAL (Ubuntu): 

Pour obtenir la version la plus récente de GDAL run la commande suivante qui ajoute aux sources: 
```sh
sudo add-apt-repository ppa:ubuntugis/ppa
```

Puis update les sources du package : 

```sh
sudo apt-get update
```

Installer le package GDAL/OGR : 

```sh
sudo apt-get install gdal-bin
```

Installer la librairie de développement pour GDAL :

```sh
sudo apt-get install libgdal-dev
```

Exporter les deux variables PATH suivantes : 

```sh
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
```

### Utiliser GDAL avec le CLI

GDAL possède une commande CLI qui permet de rééchantillonner le geotiff d'entrée : 

```sh
gdaladdo -r average in.tif 2 4 8 16
```

Ici on a une image d'entrée "in.tif" qui va être rééchantillonnée à plusieurs niveaux de zoom ici 2,4,8 et 16.

Ensuite on peut appliquer un algorithme de GDAL qui permet de produire nos COG : 

```sh
gdal_translate in.tiff out.tiff -co COMPRESS=LZW -co TILED=YES -co COPY_SRC_OVERVIEWS=YES
```
Cet algorithme permet de créer des tuiles, copie les aperçus existants de GeoTiff, et compresse le GeoTiff.
