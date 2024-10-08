import { DataTypes } from 'sequelize';

export function model(sequelize) {
    
    const Docente = sequelize.define('Docente', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre: {
            type: DataTypes.STRING,
            allowNull: false
        },
        apellidos: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        rol: {
            type: DataTypes.ENUM('Usuario', 'Decanato', 'Admin'),
            defaultValue: 'Usuario'
        }
    }, {
        freezeTableName: true,
        createdAt: 'creadoEn',
        updatedAt: 'actualizadoEn'
    });

    Docente.associate = function (models) {
        models.Docente.hasMany(models.Actividad, { as: 'responsable', foreignKey: { name: 'responsable_id', allowNull: false }}); //Un docente es responsable de varias clases (responsable)
        models.Docente.belongsToMany(models.Actividad, { as: 'imparte', through: { model: models.Join_Actividad_Docentes, foreignKey: 'docente_id', allowNull: false }, foreignKey: 'docente_id' }); //Un docente imparte varias clases (imparte)
        models.Docente.belongsToMany(models.Espacio, { as: 'ha_impartido', through: { model: models.Asistencia, foreignKey: 'docente_id', allowNull: false }, foreignKey: 'docente_id' }); //Un docente asiste a varios espacios para realizar actividades
        models.Docente.hasMany(models.Macs, { as: 'con_mac', foreignKey: { name: 'usuario_id', allowNull: false }}); // Un docente puede tener varias Macs asociadas
        models.Docente.hasMany(models.Nfcs, { as: 'con_nfc', foreignKey: { name: 'usuario_id', allowNull: false }}); // Un docente puede tener varios Nfcs asociados
    };

    return Docente;
}
