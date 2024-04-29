-- INSERTION DE DONNÉES DE TEST POUR LA TABLE user
INSERT INTO public.user (username,password) VALUES
('lem','$2b$12$YXcYeaRXilIr9qoTsEC50e3Vt6rQtlhO5LVP.S34P9.8Qp97CyKmS'),
('leh','$2b$12$t7I.kRd0ZR3M3Z4CQlxaM.clIOp8yGkcYUBo14Fi51tJCnmUJhkQ.'),
('lev','$2b$12$J3sF5DCuKx24Eh/ci08baePD9rcYIUb/B4eZRqdiZXhVe3sh/PhF6'),
('lef','$2b$12$sWHkNzLjA/D/MVyWhEDrZeEg7hbaOvehUhxBJnYaEutXt83vXtiTq');


-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Chantier
INSERT INTO public.Chantier (name, nomenclature, nbr_image, stac_url, createur, annotateur, reviewer, message, reviewed) VALUES
('Yzernay', 1, 2, 'https://exemple.com/chantier1', 1, 2, 3, 'ras',false),
('Cherbourg', 2, 1, 'https://exemple.com/chantier1', 1, 3, 4, 'tout à refaire',false),
('Paris', 1, 1, 'https://exemple.com/chantier2', 2, 1, 3, 'bon à jeter',true);

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Image_sortie
INSERT INTO public.image_sortie (name, id_chantier,current_patch) VALUES
('https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/10/T/ES/2022/7/S2A_10TES_20220726_0_L2A/TCI.tif', 1, '{1, 2}'),
('https://storage.googleapis.com/open-cogs/stac-examples/20201211_223832_CS2.tif', 1,'{1, 2}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Patch
INSERT INTO public.patch (name, id_img_sortie, data, i, j, segmentation_value) VALUES
('image_1_patch_0_0', 1, '{"key": "value"}', 0, 0, 0.395961707746479),
('image_2_patch_0_0', 2, '{"key": "value"}', 0, 0, 0.270961707746479);


-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Catalogue 
INSERT INTO public.catalogue (name, data) VALUES
('Catalogue1', '{"key": "value"}'),
('Catalogue2', '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE COG
INSERT INTO public.cog (name, data, id_catalogue) VALUES
('COG1', '{"key": "value"}', 1),
('COG2', '{"key": "value"}', 2);

