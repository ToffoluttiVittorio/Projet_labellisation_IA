-- INSERTION DE DONNÉES DE TEST POUR LA TABLE user
INSERT INTO public.nomenclature (nom) VALUES
('nomTest'),
('nomTest2');


-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Chantier
INSERT INTO public.style (nomenclature, nom, couleur) VALUES
(1, 'lave', '#ff0000'),
(1, 'eau', '#0000ff'),
(1, 'herbe', '#00ff00'),
(2, 'blé', '#ff0000'),
(2, 'eau', '#0000ff'),
(2, 'herbe', '#00ff00');
