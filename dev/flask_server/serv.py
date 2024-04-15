from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.dialects.postgresql import JSONB

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
    id_style = db.Column(db.Integer, nullable=False)
    code = db.Column(db.Integer, nullable=False)
    nbr_image = db.Column(db.Integer, nullable=False)
    stac_url = db.Column(db.String(255), nullable=False)

class Image_sortie(db.Model):
    __tablename__ = 'image_sortie'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(JSONB)
    id_chantier = db.Column(db.Integer, db.ForeignKey('chantier.id'), nullable=False)

class Patch(db.Model):
    __tablename__ = 'patch'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    id_img_sortie = db.Column(db.Integer, db.ForeignKey('image_sortie.id'), nullable=False)
    data = db.Column(JSONB, nullable=False)

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
    return {'id': chantier.ID}, 201

@app.route('/data/image_sortie', methods=['POST'])
def create_image_sortie():
    image_sortie = Image_sortie(**request.json)
    db.session.add(image_sortie)
    db.session.commit()
    return {'id': image_sortie.ID}, 201

@app.route('/data/patch', methods=['POST'])
def create_patch():
    patch = Patch(**request.json)
    db.session.add(patch)
    db.session.commit()
    return {'id': patch.ID}, 201

@app.route('/data/catalogue', methods=['POST'])
def create_catalogue():
    catalogue = Catalogue(**request.json)
    db.session.add(catalogue)
    db.session.commit()
    return {'id': catalogue.ID}, 201

@app.route('/data/cog', methods=['POST'])
def create_cog():
    cog = COG(**request.json)
    db.session.add(cog)
    db.session.commit()
    return {'id': cog.ID}, 201

################################## BDD GESTION ##################################

class Test_Gestion(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'test_gestion'
    id = db.Column('id', db.Integer, primary_key=True)
    name = db.Column('name', db.String(255), nullable=False)

class Style(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'style'
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(255), nullable=False)
    couleur_de_fond = db.Column(db.Integer)
    type_de_ligne = db.Column(db.String(255))
    taille_de_ligne = db.Column(db.Integer)
    transparence = db.Column(db.Integer)

class Nomenclature(db.Model):
    __bind_key__ = 'db2'
    __tablename__ = 'nomenclature'
    id_style = db.Column(db.Integer, nullable=False)
    id = db.Column(db.Integer, primary_key=True)
    libellé = db.Column(db.String(255), nullable=False)
    couleur = db.Column(db.Integer, nullable=False)
    style_id = db.Column(db.Integer, db.ForeignKey('style.id'), nullable=False)

@app.route('/gestion/test', methods=['POST'])
def create_test_gestion():
    name = request.json.get('name')
    test = Test_Gestion(name=name)
    db.session.add(test)
    db.session.commit()
    return {'id': test.id}, 201

@app.route('/gestion/style', methods=['POST'])
def create_style():
    style = Style(**request.json)
    db.session.add(style)
    db.session.commit()
    return {'id': style.id}, 201

@app.route('/gestion/nomenclature', methods=['POST'])
def create_nomenclature():
    nomenclature = Nomenclature(**request.json)
    db.session.add(nomenclature)
    db.session.commit()
    return {'id': nomenclature.ID}, 201

if __name__ == '__main__':
    app.run(debug=True)