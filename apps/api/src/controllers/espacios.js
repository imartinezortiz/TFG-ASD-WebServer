import { apiLogger } from '../../../../packages/logger/src/logger.js';
import moment from 'moment';
import { Op } from 'sequelize';
import { isInRecurrencia } from '@informaticaucm/seguimiento-events';

export async function getEspacios(req, res, next, db) {
    const transaction = await db.sequelize.transaction();
    
    try {
        apiLogger.info('Searching in Espacio for id, numero, tipo, edificio');
        const query = await db.sequelize.models.Espacio.findAll({
            attributes:['id', 'tipo', 'numero', 'edificio'],
            order: ['edificio', 'tipo', 'numero']
        });

        let espacios = [];
        query.forEach((esp) => {
            const values = esp.dataValues;
            espacios.push({ id: values.id, nombre: `${values.tipo} ${values.numero}`, edificio: values.edificio });
        });

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(espacios);
    }
    catch (error) {
        apiLogger.error(`Error while interacting with database: ${error}`);
        await transaction.rollback();
        let err = {};
        err.status = 500;
        err.message = 'Something went wrong';
        return next(err);
    }

    await transaction.commit();
}

export async function getEspacioById(req, res, next, db) {
    let idEspacio = Number(req.params.idEspacio);
    if (!Number.isInteger(idEspacio)) {
        let err = {};
        err.status = 400;
        err.message = 'Id suministrado no válido';
        return next(err);
    }

    const transaction = await db.sequelize.transaction();
    
    try {
        apiLogger.info('Searching in Espacio for id, creadoPor, actualizadoPor, creadoEn, actualizadoEn, numero, tipo, edificio');
        const query = await db.sequelize.models.Espacio.findOne({
            attributes:['id', 'creadoPor', 'actualizadoPor', 'creadoEn', 'actualizadoEn', 'edificio', 'tipo', 'numero'],
            where: {
                id: idEspacio
            }
        });

        // Comprobamos que el usuario exista en la base de datos
        if (query == null || Object.keys(query.dataValues).length == 0) {
            await transaction.rollback();
            let err = {};
            err.status = 404;
            err.message = 'Espacio no encontrado';
            return next(err);
        }
        
        const respuesta = {
            id: query.id,
            creadoEn: query.creadoEn,
            actualizadoEn: query.actualizadoEn,
            creadoPor: query.creadoPor,
            actualizadoPor: query.actualizadoPor,
            nombre: `${query.tipo} ${query.numero}`,
            edificio: query.edificio
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(respuesta);
    
    }
    catch (error) {
        apiLogger.error(`Error while interacting with database: ${error}`);
        await transaction.rollback();
        let err = {};
        err.status = 500;
        err.message = 'Something went wrong';
        return next(err);
    }

    await transaction.commit();
}

export async function getEspaciosOfUsuario(req, res, next, db) {
    let idUsuario = Number(req.params.idUsuario);
    if (!Number.isInteger(idUsuario)) {           
        let err = {};
        err.status = 400;
        err.message = 'Id suministrado no válido';
        return next(err);
    }
    
    const transaction = await db.sequelize.transaction();
    
    try {
        apiLogger.info('Searching in Docente for id');
        const query_doc = await db.sequelize.models.Docente.findOne({
            attributes:['id'],
            where: {
                id: idUsuario
            }
        });

        // Comprobamos que el usuario exista en la base de datos
        if (query_doc == null || Object.keys(query_doc.dataValues).length == 0) {
            await transaction.rollback();
            let err = {};
            err.status = 404;
            err.message = 'Usuario no encontrado';
            return next(err);
        }

        let respuesta = { espacios: [] };
        let actividades_ids = [];
        let actividades_posibles = [];
        let espacios_ids = [];
        
        const currentHour = moment().format('HH:mm'); //Cambiar la hora para probar aquí (ejemplo "16:30", tener en cuenta que se busca en UTC)

        apiLogger.info(req.body.opcion);
        apiLogger.info(`currentHour = ${currentHour}, alt = ${moment().utc().format('HH:mm')}`)

        switch (req.body.opcion) {
            case "espacios_rutina":

                apiLogger.info('Searching in Actividad impartida por Docente for actividad_id');
                const query_r = await db.sequelize.models.Actividad.findAll({
                    attributes: ['id'], 
                    include: {
                        model: db.sequelize.models.Docente,
                        as: 'impartida_por',
                        where: {
                            id: req.params.idUsuario 
                        }
                    },
                });
                
                //Si tiene actividades
                if (query_r.length != 0) {

                    query_r.forEach((act) => {
                        actividades_ids.push(act.dataValues.id);
                    });

                    apiLogger.info('Searching in Actividad for id, tiempo_inicio, tiempo_fin, fecha_inicio, fecha_fin, es_todo_el_dia');
                    
                    //Comprobamos que estén en la franja horaria actual
                    const query_act_r = await db.sequelize.models.Actividad.findAll({
                        attributes:['id', 'tiempo_inicio', 'tiempo_fin', 'es_recurrente', 'fecha_inicio', 'fecha_fin', 'es_todo_el_dia'],
                        where: {
                            id: {
                                [Op.or]: actividades_ids
                            },
                            tiempo_inicio: { 
                                [Op.lte]: currentHour
                            },
                            tiempo_fin: {
                                [Op.gte]: currentHour
                            }
                        }
                    });

                    for (let i = 0; i < query_act_r.length; i++) {
                        let act = query_act_r[i].dataValues;
                        
                        const hoy_hora_inicio = moment(act.tiempo_inicio, 'HH:mm').utc();

                        apiLogger.info('Searching in Excepcion for id, esta_reprogramado, fecha_inicio_act, fecha_fin_act, fecha_inicio_ex, fecha_fin_ex');
                        const excepciones = await db.sequelize.models.Excepcion.findAll({
                            attributes: ['id', 'esta_reprogramado', 'fecha_inicio_act', 'fecha_fin_act', 'fecha_inicio_ex', 'fecha_fin_ex'],
                            where: {
                                actividad_id: act.id,
                                esta_cancelado: 'Sí'
                            }
                        });

                        
                        if (act.es_recurrente == 'Sí') {
                            apiLogger.info('Searching in Recurrencia for id, tipo_recurrencia, separacion, maximo, dia_semana, dia_mes, semana_mes, mes_anio');
                            const recurrencias = await db.sequelize.models.Recurrencia.findAll({
                                attributes: ['id', 'tipo_recurrencia', 'separacion', 'maximo', 'dia_semana', 'dia_mes', 'semana_mes', 'mes_anio'],
                                where: {
                                    actividad_id: act.id
                                }
                            });

                            apiLogger.info(`Buscando en recurrencias para actividad ${act.id} (${act.fecha_inicio} - ${act.fecha_fin}; ${act.tiempo_inicio} - ${act.tiempo_fin})`);
                            for (let j = 0; j < recurrencias.length; j++) {
                                let rec = recurrencias[j].dataValues;
                                let cancelada = false;

                                apiLogger.info(`Actividad ${act.id} para recurrencia ${rec.id} (${rec.tipo_recurrencia}, ${rec.dia_semana}, ${hoy_hora_inicio}), ${isInRecurrencia(act, rec, hoy_hora_inicio.format("YYYY-MM-DD HH:mm:ss"))}`);
                                if (isInRecurrencia(act, rec, hoy_hora_inicio.format("YYYY-MM-DD HH:mm:ss"))) {
                                    // Comprobar que si está cancelado es en la fecha de la recurrencia
                                    apiLogger.info(`Actividad ${act.id} en recurrencia ${rec.id}`);
                                    for (let k = 0; k < excepciones.length && !cancelada; k++) {
                                        let exc = excepciones[k].dataValues;

                                        cancelada = (moment(exc.fecha_inicio_act + 'Z').utc().format('YYYY-MM-DD HH:mm') == hoy_hora_inicio.format('YYYY-MM-DD HH:mm'));
                                        apiLogger.info(`Cancelada actividad ${act.id} por excepción ${exc.id} (${moment(exc.fecha_inicio_act + 'Z').utc().format('YYYY-MM-DD HH:mm')}
                                                     == ${hoy_hora_inicio.format('YYYY-MM-DD HH:mm')} => ${moment(exc.fecha_inicio_act + 'Z').utc().format('YYYY-MM-DD HH:mm') == hoy_hora_inicio.format('YYYY-MM-DD HH:mm')})`)
                                    }
                          
                                    if (!cancelada) {
                                        actividades_posibles.push(act.id);
                                        break;
                                    }
                                }
                            }
                        }
                        else {
                            // Comprobar que si está cancelado es en la fecha de la actividad o reprogramacion
                            for (let j = 0; j < excepciones.length && !cancelada; j++) {
                                let exc = excepciones[j].dataValues;

                                cancelada = (moment(exc.fecha_inicio_act + 'Z').utc().format('YYYY-MM-DD HH:mm') == hoy_hora_inicio.format('YYYY-MM-DD HH:mm'));
                            }
                      
                            if (!cancelada) {
                                actividades_posibles.push(act.id);
                                break;
                            }
                        }
                    }

                    const ahora = moment().utc().format('YYYY-MM-DD HH:mm:00');

                    //Sacamos las actividades reprogramadas para ahora mismo
                    const query_reprog = await db.sequelize.models.Excepcion.findAll({
                        attributes: ['id', 'actividad_id'],
                        where: {
                            esta_cancelado: 'No',
                            esta_reprogramado: 'Sí',
                            fecha_inicio_ex: { [Op.lte]: ahora },
                            fecha_fin_ex: { [Op.gte]: ahora }
                        }
                    });

                    query_reprog.forEach((reprog) => {
                        actividades_posibles.push(reprog.actividad_id);
                    });

                    //Si hay actividades posibles en estos momentos buscamos sus espacios
                    if (actividades_posibles.length != 0) {

                        apiLogger.info('Searching in Espacio ocupado por Actividad for id');
                        
                        //Encontramos todos los ids de los espacios pertenecientes a actividades posibles
                        const query_esp_r = await db.sequelize.models.Espacio.findAll({
                            attributes:['id'],
                            include: {
                                model: db.sequelize.models.Actividad,
                                as: 'ocupado_por',
                                where: {
                                    id: {
                                        [Op.or]: actividades_posibles
                                    }
                                }
                            },
                            order: [['edificio'], ['tipo'], ['numero']]
                        });

                        //Obtenemos los espacios de las actividades
                        query_esp_r.forEach((esp) => {
                            espacios_ids.push({ id: esp.dataValues.id });
                        });

                        respuesta.espacios = espacios_ids;
                    }
                }

            break;
            case "espacios_irregularidad":

                apiLogger.info('Searching in Actividad impartida por Docente for id');
                const query_i = await db.sequelize.models.Actividad.findAll({
                    attributes: ['id'], 
                    include: {
                        model: db.sequelize.models.Docente,
                        as: 'impartida_por',
                        where: { 
                            id: req.params.idUsuario
                        }
                    }
                });
                
                //Si tiene actividades
                if (query_i.length != 0) {

                    query_i.forEach((act) => {
                        actividades_ids.push(act.dataValues.id);
                    });

                    apiLogger.info('Searching in Actividad for id, tiempo_inicio, tiempo_fin');
                    
                    //Comprobamos que estén en la franja horaria actual
                    const query_act_i = await db.sequelize.models.Actividad.findAll({
                        attributes:['id', 'tiempo_inicio', 'tiempo_fin'],
                        where: {
                            id: {
                                [Op.or]: actividades_ids
                            }
                        }   
                    });

                    query_act_i.forEach((act) => {
                        if (moment(act.dataValues.tiempo_inicio, 'HH:mm').utc().format('HH:mm') <= moment(currentHour, "HH:mm").utc().format('HH:mm') 
                            && moment(currentHour, "HH:mm").utc().format('HH:mm') <= moment(act.dataValues.tiempo_fin, 'HH:mm').utc().format('HH:mm')) {
                        
                            actividades_posibles.push(act.dataValues.id);
                        }
                    });
                    
                    //Si hay actividades posibles en estos momentos buscamos sus espacios
                    if (actividades_posibles.length != 0) {

                        apiLogger.info('Searching in Espacio ocupado por Actividad for espacio_id');
                        
                        //Encontramos todos los ids de los espacios pertenecientes a actividades posibles
                        const query_esp_i = await db.sequelize.models.Espacio.findAll({
                            attributes:['id'],
                            include: {
                                model: db.sequelize.models.Actividad,
                                as: 'ocupado_por',
                                where: {
                                    id: {
                                    [Op.or]: actividades_posibles
                                    }
                                }
                            }
                        });

                        //Obtenemos los espacios de las actividades
                        query_esp_i.forEach((esp) => {
                            espacios_ids.push({ id: esp.dataValues.id });
                        });

                        let query_neg_i = await db.sequelize.models.Espacio.findAll({
                            attributes: ['id'],
                            where: {
                                [Op.not]: { [Op.or]: espacios_ids }
                            },
                            order: [['edificio'], ['tipo'], ['numero']]
                        });

                        let espacios_ids_neg = [];
                        query_neg_i.forEach((esp) => {
                            espacios_ids_neg.push({ id: esp.dataValues.id });
                        });
                        
                        respuesta.espacios = espacios_ids_neg;
                    }
                }

                apiLogger.info(`${query_i.length}, ${respuesta.espacios.length}, ${query_i.length == 0 || respuesta.espacios.length == 0}`);

                if (query_i.length == 0 || respuesta.espacios.length == 0) {
                    let query_esp = await db.sequelize.models.Espacio.findAll({
                        attributes: ['id'],
                        order: [['edificio'], ['tipo'], ['numero']]
                    });

                    let todo_espacio = [];
                    query_esp.forEach((esp) => {
                        todo_espacio.push({ id: esp.dataValues.id });
                    });

                    respuesta.espacios = todo_espacio;
                }
                
            break;
            default:
                await transaction.rollback();
                let err = {};
                err.status = 422;
                err.message = 'Datos no válidos';
                return next(err);
        }

        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(respuesta);
        
    }
    catch (error) {
        apiLogger.error(`Error while interacting with database: ${error}`);
        await transaction.rollback();
        let err = {};
        err.status = 500;
        err.message = 'Something went wrong';
        return next(err);
    }

    await transaction.commit();
}

export async function getEspacioOfActividad(req, res, next, db) {
    let idActividad = Number(req.params.idActividad);
    if (!Number.isInteger(idActividad)) {
        let err = {};
        err.status = 400;
        err.message = 'Id suministrado no válido';
        return next(err);
    }

    const transaction = await db.sequelize.transaction();

    try {
        const query_act = await db.sequelize.models.Actividad.findOne({
            where: {
                id: idActividad
            }
        });
    
        // Comprobamos que la actividad exista en la base de datos
        if (query_act == null || Object.keys(query_act.dataValues).length == 0) {            
            await transaction.rollback();
            let err = {};
            err.status = 404;
            err.message = 'Actividad no encontrada';
            return next(err);
        }
    
        const query_act_esp = await db.sequelize.models.Espacio.findAll({
            attributes: ['id'],
            include: {
                model: db.sequelize.models.Actividad,
                as: 'ocupado_por',
                where: {
                    id: idActividad
                }
            }
        });
    
        if (query_act_esp.length > 0) {
            let resultado = { espacios: [] };

            query_act_esp.forEach((esp) => {
                resultado.espacios.push({ id: esp.dataValues.id });
            });

            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(resultado);
        }
    }
    catch (error) {
        apiLogger.error(`Error while interacting with database: ${error}`);
        await transaction.rollback();
        let err = {};
        err.status = 500;
        err.message = 'Something went wrong';
        return next(err);
    }
    

    await transaction.commit();
}
