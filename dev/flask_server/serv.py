from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import ARRAY

app = Flask(__name__)
CORS(app)
# Configure SQLAlchemy for the first database
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:postgres@localhost:8888/data'

# Configure SQLAlchemy for the second database
app.config['SQLALCHEMY_BINDS'] = {
    'db2': 'postgresql://postgres:postgres@localhost:9999/gestion'
}

db = SQLAlchemy(app)

################################## BDD DATA ##################################

class Test(db.Model):
    __tablename__ = 'test'
    id = db.Column('id', db.Integer, primary_key=True)
    name = db.Column('name', db.String(255), nullable=False)

class Chantier(db.Model):
    __tablename__ = 'chantier'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    nomenclature = db.Column(db.Integer) 
    nbr_image = db.Column(db.Integer, nullable=False)
    stac_url = db.Column(db.String(255), nullable=False)
    createur = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    annotateur = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    reviewer = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(255))
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)

class Image_sortie(db.Model):
    __tablename__ = 'image_sortie'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    id_chantier = db.Column(db.Integer, db.ForeignKey('chantier.id'), nullable=False)
    current_patch = db.Column(ARRAY(db.Integer))
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class Patch(db.Model):
    __tablename__ = 'patch'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    id_img_sortie = db.Column(db.Integer, db.ForeignKey('image_sortie.id'), nullable=False)
    data = db.Column(JSONB)
    i = db.Column(db.Integer)
    j = db.Column(db.Integer)
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'id_img_sortie': self.id_img_sortie,
            'data': self.data,
            'i': self.i,
            'j': self.j
        }

class Catalogue(db.Model):
    __tablename__ = 'catalogue'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(JSONB, nullable=False)

class COG(db.Model):
    __tablename__ = 'cog'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(JSONB, nullable=False)
    id_catalogue = db.Column(db.Integer, db.ForeignKey('catalogue.id'), nullable=False)

@app.route('/data/chantier/getChantierInfo', methods=['GET'])
def get_chantier_info():
    chantier_id = request.args.get('id')
    chantier = Chantier.query.get(chantier_id)
    if chantier:
        return {'chantier': chantier.to_dict()}
    else:
        return {'error': 'Chantier introuvable'}, 404


@app.route('/data/test', methods=['POST'])
def create_test():
    name = request.json.get('name')
    test = Test(name=name)
    db.session.add(test)
    db.session.commit()
    return {'id': test.id}, 201

@app.route('/data/chantier', methods=['POST'])
def create_chantier():
    chantier = Chantier(**request.json)
    db.session.add(chantier)
    db.session.commit()
    return {'id': chantier.id}, 201

@app.route('/data/user/getChantier', methods=['GET'])
def get_chantier():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    if user:
        chantiers = Chantier.query.filter_by(createur=user.id).all()
        return {'chantier': [c.to_dict() for c in chantiers]}
    else:
        return {'error': 'Utilisateur introuvable'}, 404

@app.route('/data/chantier/getImages', methods=['GET'])
def get_images():
    images = Image_sortie.query.filter_by(id_chantier=request.args.get('id_chantier')).all()
    return {'images': [i.to_dict() for i in images]}

@app.route('/data/image_sortie', methods=['POST'])
def create_image_sortie():
    image_sortie = Image_sortie(**request.json)
    db.session.add(image_sortie)
    db.session.commit()
    return {'id': image_sortie.id}, 201

@app.route('/data/update_current_patch', methods=['POST'])
def update_current_patch():
    image_sortie = Image_sortie.query.get(request.json.get('id'))
    image_sortie.current_patch = request.json.get('current_patch')
    db.session.commit()
    return {'id': image_sortie.id}, 201

@app.route('/data/patch', methods=['POST'])
def create_patch():
    patch = Patch(**request.json)
    db.session.add(patch)
    db.session.commit()
    return {'id': patch.id}, 201

@app.route('/data/catalogue', methods=['POST'])
def create_catalogue():
    catalogue = Catalogue(**request.json)
    db.session.add(catalogue)
    db.session.commit()
    return {'id': catalogue.id}, 201

@app.route('/data/cog', methods=['POST'])
def create_cog():
    cog = COG(**request.json)
    db.session.add(cog)
    db.session.commit()
    return {'id': cog.id}, 201

@app.route('/data/user/getUser', methods=['GET'])
def get_users():
    users = User.query.all()
    user_data = [{'id': user.id, 'username': user.username} for user in users]
    return {'users': user_data}
    

@app.route('/data/user/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user:
        if user.password == password:
            return {'message': 'Connexion réussie'}, 200
        else:
            return {'error': 'Mot de passe incorrect'}, 401
    else:
        return {'error': 'Nom d\'utilisateur introuvable'}, 404    
    
    
@app.route('/data/user/createUser', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return {'message': 'Nom d\'utilisateur déjà pris'}, 400

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return {'message': 'Utilisateur créé avec succès'}, 201

@app.route('/data/user/getUserId', methods=['GET'])
def get_user_id():
    username = request.args.get('username')
    if not username:
        return {'error': 'No username provided'}, 400
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return {'error': 'User not found'}, 404

    return {'user_id': user.id}

@app.route('/data/user/getUserName', methods=['GET'])
def get_user_Name():
    id = request.args.get('id')
    if not id:
        return {'error': 'No id provided'}, 400
    
    user = User.query.filter_by(id=id).first()
    if not user:
        return {'error': 'User not found'}, 404

    return {'user_name': user.username}

@app.route('/data/chantier/delete', methods=['DELETE'])
def delete_chantier():
    chantier_id = request.args.get('id')
    if chantier_id:
        images = Image_sortie.query.filter_by(id_chantier=chantier_id).all()
        for image in images:
            db.session.delete(image)
       
        chantier = Chantier.query.get(chantier_id)
        if chantier:
            db.session.delete(chantier)
            db.session.commit()
            return {'message': 'Chantier supprimé avec succès'}, 200
        else:
            return {'error': 'Chantier introuvable'}, 404
    else:
        return {'error': 'ID du chantier non fourni'}, 400

@app.route('/save_patch', methods=['POST'])
def save_patch():
    data = request.get_json()

    name = data.get('name')
    id_img_sortie = data.get('id_img_sortie')
    geoJSON = data.get('data')
    i = data.get('i')
    j = data.get('j')

    if not name or not id_img_sortie or not geoJSON or i is None or j is None:
        return "Error: All fields must be filled", 400

    patch = Patch.query.filter_by(id_img_sortie=id_img_sortie, i=i, j=j).first()

    if patch:
        # Patch exists, update data
        patch.data = geoJSON
    else:
        # Patch does not exist, create new
        patch = Patch(name=name, id_img_sortie=id_img_sortie, data=geoJSON, i=i, j=j)
        db.session.add(patch)

    db.session.commit()

    return "Patch enregistré avec succès"

@app.route('/get_patches', methods=['GET'])
def get_patches():
    image_id = request.args.get('image_id')

    patches = Patch.query.filter_by(id_img_sortie=image_id).all()

    return jsonify([patch.to_dict() for patch in patches])


################################## BDD GESTION ##################################

class Test_Gestion(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'test_gestion'
    id = db.Column('id', db.Integer, primary_key=True)
    name = db.Column('name', db.String(255), nullable=False)

class Nomenclature(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'nomenclature'
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(255), nullable=False)

class Style(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'style'
    id = db.Column(db.Integer, primary_key=True)
    nomenclature = db.Column(db.Integer, db.ForeignKey('nomenclature.id'))
    nom = db.Column(db.String(255), nullable=False)
    couleur = db.Column(db.String(255), nullable=False)

@app.route('/gestion/test', methods=['POST'])
def create_test_gestion():
    name = request.json.get('name')
    test = Test_Gestion(name=name)
    db.session.add(test)
    db.session.commit()
    return {'id': test.id}, 201

@app.route('/gestion/nomenclature', methods=['POST'])
def create_nomenclature():
    nom = request.json['nom']
    champs = request.json['champs']
    
    nomenclature = Nomenclature(nom=nom)
    db.session.add(nomenclature)
    db.session.commit()
    
    for champ, couleur in champs:
        style = Style(nomenclature=nomenclature.id, nom=champ, couleur=couleur)
        db.session.add(style)
    db.session.commit()

    return {'id': nomenclature.id}, 201
    
@app.route('/gestion/nomenclatures', methods=['GET'])
def get_nomenclatures_and_styles():
    nomenclatures = Nomenclature.query.all()
    nomenclatures_with_styles = []
    for nomenclature in nomenclatures:
        styles = Style.query.filter_by(nomenclature=nomenclature.id).all()
        styles_json = [{'id': style.id, 'nom': style.nom, 'couleur': style.couleur} for style in styles]
        nomenclature_json = {'id': nomenclature.id, 'nom': nomenclature.nom, 'styles': styles_json}
        nomenclatures_with_styles.append(nomenclature_json)
    return jsonify(nomenclatures_with_styles)


if __name__ == '__main__':
    app.run(debug=True)
