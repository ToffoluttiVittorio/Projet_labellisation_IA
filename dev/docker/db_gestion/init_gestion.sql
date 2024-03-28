-- use postgis to manipule geometries
CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------------ --
-- --  Tables and constraints                                      -- --
-- ------------------------------------------------------------------ --


CREATE TABLE public.Style (
    id SERIAL PRIMARY KEY,
    Nom VARCHAR(255) NOT NULL,
    "Couleur de fond" INT,
    "Type de ligne" VARCHAR(255),
    "Taille de ligne" INT,
    Transparence INT
);

ALTER TABLE IF EXISTS public.Style
	OWNER to postgres;


CREATE TABLE public.Nomenclature (
    ID_style INT NOT NULL,
    ID SERIAL PRIMARY KEY,
    Libellé VARCHAR(255) NOT NULL,
    Couleur INT NOT NULL,
    FOREIGN KEY (ID_style) REFERENCES Style(id)
);

ALTER TABLE IF EXISTS public.Nomenclature
	OWNER to postgres;
