### Autres Segmentations

Ce readme présente différentes méthodes de segmentations pour étuidier les alternatives à l'algorithme développer par les étudiants d'EPITA.

Voici le résultat d'une segmentation par l'algorithme d'EPITA : 

Les algorithmes sont présents dans la librairie python skimage.

## Segmentation de Felzenszwalb

Cet algorithme rapide de segmentation d'images 2D, est populaire dans la communauté de la vision par ordinateur. L'algorithme possède un seul paramètre d'échelle qui influence la taille des segments. La taille réelle et le nombre de segments peuvent varier considérablement en fonction du contraste local.

![Capture d’écran du 2024-03-22 12-29-38](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/61098254/99774f6b-1a8c-4807-8c3b-88ca680c5c99)

## Segmentation SLIC (K-means)

Cet algorithme exécute simplement la méthode K-means dans l'espace 5d des informations sur les couleurs et l'emplacement de l'image et est donc étroitement lié à la méthode quickshift. La méthode de regroupement étant plus simple, elle est très efficace. Il est essentiel pour cet algorithme de travailler dans l'espace couleur Lab pour obtenir de bons résultats. L'algorithme a rapidement pris de l'ampleur et est aujourd'hui largement utilisé. Le paramètre de compacité permet d'arbitrer entre la similarité des couleurs et la proximité, comme dans le cas de Quickshift, tandis que n_segments choisit le nombre de centres pour kmeans.

![Capture d’écran du 2024-03-22 13-47-24](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/61098254/1b6a6500-1c69-4ef6-a4b9-7054c28825b9)


## Segmentation Quickshift 

Quickshift est un algorithme de segmentation d'images 2D relativement récent, basé sur une approximation du décalage de la moyenne kernélisée. Il appartient donc à la famille des algorithmes de recherche de mode local et est appliqué à l'espace 5D composé d'informations sur les couleurs et l'emplacement de l'image.

L'un des avantages du quickshift est qu'il calcule en fait une segmentation hiérarchique à plusieurs échelles simultanément.

Quickshift a deux paramètres principaux : sigma contrôle l'échelle de l'approximation de la densité locale, max_dist sélectionne un niveau dans la segmentation hiérarchique qui est produite. Il existe également un compromis entre la distance dans l'espace couleur et la distance dans l'espace image, donné par le ratio.

![Capture d’écran du 2024-03-22 13-49-50](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/61098254/67f13bd0-c6a0-474c-b77a-b338993aadcd)


## Segmentation Watershed

Cet algorithme exécute simplement la méthode K-means dans l'espace 5d des informations sur les couleurs et l'emplacement de l'image et est donc étroitement lié à la méthode quickshift. La méthode de regroupement étant plus simple, elle est très efficace. Il est essentiel pour cet algorithme de travailler dans l'espace couleur Lab pour obtenir de bons résultats. L'algorithme a rapidement pris de l'ampleur et est aujourd'hui largement utilisé. Le paramètre de compacité permet d'arbitrer entre la similarité des couleurs et la proximité, comme dans le cas de Quickshift, tandis que n_segments choisit le nombre de centres pour kmeans.


![Capture d’écran du 2024-03-22 13-51-47](https://github.com/ToffoluttiVittorio/Projet_labellisation_IA/assets/61098254/e98fca9e-1404-4832-a999-85b48ee7e2a7)

## Résultat des segmentations

| Nom Segmentation | Nombre de Segments | Temps (s) | Paramètres |
|------------------|---------------------|------------|------------|
| Felzenszwalb     | 1110                | 2.98       | Scale=100, Sigma=0.5, Min_size=50 |
| SLIC             | 200                 | 1.93       | N_segments=250, Compactness=10, Sigma=1 |
| Quickshift       | 12186               | 11.59      | Kernel_size=3, Max_dist=6, Ratio=0.5 |
| Watershed        | 240                 | 1.26       | Markers=250, Compactness=0.001 |

