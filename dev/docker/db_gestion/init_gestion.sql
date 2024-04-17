-- use postgis to manipule geometries
CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------------ --
-- --  Tables and constraints                                      -- --
-- ------------------------------------------------------------------ --


CREATE TABLE public.style (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    couleur_de_fond INT,
    type_de_ligne VARCHAR(255),
    taille_de_ligne INT,
    transparence INT
);

ALTER TABLE IF EXISTS public.style
	OWNER to postgres;


CREATE TABLE public.nomenclature (
    id_style INT NOT NULL,
    id SERIAL PRIMARY KEY,
    libellé VARCHAR(255) NOT NULL,
    couleur INT NOT NULL,
    FOREIGN KEY (id_style) REFERENCES style(id)
);

ALTER TABLE IF EXISTS public.nomenclature
	OWNER to postgres;
