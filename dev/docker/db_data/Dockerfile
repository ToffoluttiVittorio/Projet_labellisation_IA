FROM postgis/postgis:16-3.4

# Ajoutez les scripts d'initialisation dans le conteneur
ADD init_data.sql /docker-entrypoint-initdb.d/10_init_data.sql

# Donnez les autorisations appropriées aux scripts
RUN chmod a+r /docker-entrypoint-initdb.d/*

# Exposez le port si nécessaire
EXPOSE 5432
