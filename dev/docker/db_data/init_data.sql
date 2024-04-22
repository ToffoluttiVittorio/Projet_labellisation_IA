-- use postgis to manipule geometries
CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------------ --
-- --  Tables and constraints                                      -- --
-- ------------------------------------------------------------------ --

CREATE TABLE public.user(
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    password VARCHAR(255)
);

ALTER TABLE IF EXISTS public.user
	OWNER to postgres;

CREATE TABLE public.chantier (
    id SERIAL PRIMARY KEY,
    id_style INT NOT NULL,
    code INT NOT NULL,
    nbr_image INT NOT NULL,
    stac_url VARCHAR(255) NOT NULL,
    user_key INT NOT NULL,
    FOREIGN KEY (user_key) REFERENCES "user"(id),
    name VARCHAR(255)
);

ALTER TABLE IF EXISTS public.chantier
	OWNER to postgres;

CREATE TABLE public.image_sortie (
    id SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    id_chantier INT NOT NULL,
    FOREIGN KEY (id_chantier) REFERENCES chantier(id),
    current_patch integer[]
);

ALTER TABLE IF EXISTS public.image_sortie
	OWNER to postgres;

CREATE TABLE public.patch (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_img_sortie INT NOT NULL,
    FOREIGN KEY (id_img_sortie) REFERENCES image_sortie(id)
    data INT;
    i INT;
    j INT;
);

ALTER TABLE IF EXISTS public.patch
	OWNER to postgres;

CREATE TABLE public.catalogue (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL  
);

ALTER TABLE IF EXISTS public.catalogue
	OWNER to postgres;

CREATE TABLE public.cog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL,
    id_catalogue INT NOT NULL,
    FOREIGN KEY (id_catalogue) REFERENCES catalogue(id)
);

ALTER TABLE IF EXISTS public.cog
	OWNER to postgres;

