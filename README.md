# Projet plateforme web labellisation

Une interface Web implémentée dans le but d'avoir une plateforme qui traite la segmentation et la labellisation de STAC (SpatioTemporal Asset Catalogs) contenant des COG (Cloud Optimized GeoTIFF) dans le but de construire des jeux de données pour des entraînements de modèles en Machine Learning.

## Contexte

Ce projet est réalisé par des élèves de l'ENSG (Ecole nationale des sciences géographiques) et s'inscrit dans le cadre du projet de fin d'étude au sein de la fillière TSI (Technologie des Systèmes d'Information). Le sujet étant proposé par Nicolas David de l'IGN (Institut Géographique National) dans la continuité d'un projet précédent proposé aux élèves d'EPITA (École Pour l'Informatique et les Techniques Avancées).

## Démo

vidéo

## Contributeurs

- [Vittorio](https://github.com/ToffoluttiVittorio)
- [Mathéo](https://github.com/Matheoia)
- [Hannick](https://github.com/Hannick5)
- [Frédéric](https://github.com/Cirederf1)

## Guide d'installation

Suivez ces étapes pour configurer le projet :

### Étape 1 : Cloner le Projet

Tout d'abord, clonez le dépôt du projet à partir de la source.

```bash
git clone <url_du_dépôt>
```

### Étape 2 : Démarrer les Conteneurs Docker

Naviguez vers le répertoire `/dev/docker` et démarrez les conteneurs Docker.

```bash
cd /dev/docker
docker compose up -d
```

### Étape 3 : Installer les Dépendances du Projet

Naviguez vers le répertoire `/dev/inlab` et installez les dépendances du projet à l'aide de `npm`.

```bash
cd /dev/inlab
npm install
```

Consultez la section [Dépendances](#dépendances) pour obtenir la liste des dépendances du projet.

### Étape 4 : Installer les Bibliothèques Python

Avant de démarrer le serveur Flask, assurez-vous que toutes les bibliothèques Python nécessaires sont installées. Vous pouvez le faire à l'aide de `pip`.

```bash
pip install <nom_bibliothèque>
```

Consultez la section [Dépendances](#dépendances) pour obtenir la liste des dépendances du projet.

### Étape 5 : Démarrer le Serveur Flask

Naviguez vers le répertoire `/dev/flask_server` et démarrez le serveur Flask.

```bash
cd /dev//flask_server
python serv.py
```

### Étape 6 : Ouvrir l'Application

Enfin, ouvrez l'application dans Firefox à l'adresse `http://localhost:5173`. Note : Il peut y avoir des problèmes lors de l'utilisation de Chrome.

## Dépendances

Ce projet a des dépendances à la fois pour JavaScript et Python.

### npm

Voici les dépendances en production :

- [axios](https://www.npmjs.com/package/axios): ^1.6.8
- [file-saver](https://www.npmjs.com/package/file-saver): ^2.0.5
- [geotiff](https://www.npmjs.com/package/geotiff): ^2.1.3
- [jszip](https://www.npmjs.com/package/jszip): ^3.10.1
- [@vue/test-utils](https://www.npmjs.com/package/@vue/test-utils): ^2.4.5
- [jquery](https://www.npmjs.com/package/jquery): ^3.7.1
- [ol](https://www.npmjs.com/package/ol): ^9.1.0
- [ol-contextmenu](https://www.npmjs.com/package/ol-contextmenu): ^5.4.0
- [ol-ext](https://www.npmjs.com/package/ol-ext): ^4.0.17
- [ol-stac](https://www.npmjs.com/package/ol-stac): ^1.0.0-beta.9
- [proj4](https://www.npmjs.com/package/proj4): ^2.11.0
- [vite-plugin-top-level-await](https://www.npmjs.com/package/vite-plugin-top-level-await): ^1.4.1
- [vite-plugin-wasm](https://www.npmjs.com/package/vite-plugin-wasm): ^3.3.0
- [vue](https://www.npmjs.com/package/vue): ^3.4.21
- [vue-router](https://www.npmjs.com/package/vue-router): ^4.3.0
- [vue3-openlayers](https://www.npmjs.com/package/vue3-openlayers): ^6.3.0

Et les dépendances en développement :

- [@vitejs/plugin-vue](https://www.npmjs.com/package/@vitejs/plugin-vue): ^5.0.4
- [vite](https://www.npmjs.com/package/vite): ^5.2.0
- [vitest](https://www.npmjs.com/package/vitest): ^1.5.0

### Python

Voici les principales dépendances :

- [Flask](https://flask.palletsprojects.com/en/2.1.x/)
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/en/2.x/)
- [Flask-CORS](https://flask-cors.readthedocs.io/en/latest/)
- [base64](https://docs.python.org/3/library/base64.html)
- [BytesIO](https://docs.python.org/3/library/io.html#io.BytesIO)
- [Flask-Bcrypt](https://flask-bcrypt.readthedocs.io/en/latest/)

