CREATE TABLE Style (
    id SERIAL PRIMARY KEY,
    Nom VARCHAR(255) NOT NULL,
    "Couleur de fond" INT,
    "Type de ligne" VARCHAR(255),
    "Taille de ligne" INT,
    Transparence INT
);

CREATE TABLE Nomenclature (
    ID_style INT NOT NULL,
    ID SERIAL PRIMARY KEY,
    Libellé VARCHAR(255) NOT NULL,
    Couleur INT NOT NULL,
    FOREIGN KEY (ID_style) REFERENCES Style(id)
);
