import { getFromApi, sendToApiJSON } from '../seguimientoApi.js';
import moment from 'moment';
import * as he from 'he';
import { isInRecurrencia } from '@informaticaucm/seguimiento-events';
import { valoresAsistencia } from '@informaticaucm/seguimiento-api-client';

export async function getEspaciosPosibles(req, res) {

  let data = {};

  if (req.query.all == 'yes') {
    req.session.user.estado = valoresAsistencia[1];
    data.opcion = "espacios_irregularidad";
  }
  else {
    req.session.user.estado = valoresAsistencia[0];
    data.opcion = "espacios_rutina";
  }

  let espacios_doc = [];

  const id_sesion = (req.session.user.id).toString();
  const api_path = `/espacios/usuarios/${id_sesion}`;
  let espacios_ids = (await sendToApiJSON(data, api_path, res, false)).espacios;

  if (espacios_ids.length > 0) {
    let espacios_data = [];
    for (let i = 0; i < espacios_ids.length; i++) {
      const id_esp = (espacios_ids[i].id).toString();
      const api_esp_path = `/espacios/${id_esp}`;
      espacios_data.push((await getFromApi(api_esp_path, res, false)));
    }

    //Sacamos un array separando los espacios por edificio ([{ edificio, espacios }, { edificio, espacios }, ...])
    let edif = null;
    espacios_data.forEach((esp) => {
      if (esp.edificio != edif) {
        edif = esp.edificio;
        espacios_doc.push({ edificio: edif, espacios: []});
      }
      espacios_doc[espacios_doc.length - 1].espacios.push({ id: esp.id, nombre: esp.nombre });
    });
  }
  else {
    res.redirect('/formulario-aulas/?all=yes');
    return;
  }

  //Enseñamos únicamente los espacios que coincidan con las actividades
  res.render('formulario-aulas', { espacios: espacios_doc, all: (req.query.all == 'yes'), usuario: {rol: req.session.user.rol, nombre: req.session.user.nombre, apellidos: req.session.user.apellidos} });
  return;
}

export async function getAllEspacios(req, res) {
  let query_esp_all = await getFromApi('/espacios', res, true);

  let espacios_todos = [];
  let edifx = null;
  query_esp_all.forEach((esp) => {
    if (esp.edificio != edifx) {
      edifx = esp.edificio;
      espacios_todos.push({ edificio: edifx, espacios: []});
    }
    espacios_todos[espacios_todos.length - 1].espacios.push(esp);
  });
  
  // Todos los espacios
  res.render('formulario-aulas', { espacios: espacios_todos, all: true, usuario: {rol: req.session.user.rol, nombre: req.session.user.nombre, apellidos: req.session.user.apellidos}});
}

export function confirmEspacioPosible(req, res) {
  if (req.body.espacio == "Otro") {
      res.redirect('/formulario-aulas/?all=yes');
  }
  else {
      res.redirect(`/formulario-end/?espacioId=${req.body.espacio}`);
  }
  return;
}

export async function getForm(req, res) {
  let esp = '';
  let totp = '';
  if (req.query == null || Object.keys(req.query).length != 0) {
    if (req.query.espacioId) {
      esp = req.query.espacioId;
      req.session.user.espacio_id = parseInt(esp);
    }
    if (req.query.totp) totp = req.query.totp;
    req.session.save();
  }

  const currentHour = moment().utc().format('HH:mm'); //Cambiar la hora para probar aquí (ejemplo "16:30" (se transformará a UTC desde el offset local))
  const esp_data = (await getFromApi(`/espacios/${esp}`, res, true));

  // query a base de datos para conseguir asignatura y grupo que sería
  const id_sesion = (req.session.user.id).toString();
  const api_path_act_us = `/actividades/usuarios/${id_sesion}`;
  let actividades_ids_us = (await getFromApi(api_path_act_us, res, true)).actividades;
  const api_path_act_esp = `/actividades/espacios/${esp}`;
  let actividades_ids_esp = (await getFromApi(api_path_act_esp, res, true)).actividades;

  let actividad_ids_irregularidad = [];
  let actividades_esp_aparicion = [];
  let actividades_ids = actividades_ids_us.filter(x => {
    for(let i = 0; i < actividades_ids_esp.length; i++) {
      if (x.id == actividades_ids_esp[i].id) {
        actividades_esp_aparicion[i] = true;
        return true;
      }
    }
    actividad_ids_irregularidad.push(x);
    return false;
  });
  
  //Comprobamos que estén en la franja horaria actual
  let actividades_posibles = await getActividadesPosibles(res, currentHour, actividades_ids);
  if  (req.session.user.estado != null){
    irregularidad = (req.session.user.estado == valoresAsistencia[1])
  }
  else {
    irregularidad = false;
    req.session.user.estado = valoresAsistencia[0];
  }

  //Si no hay ninguna, estamos ante una irregularidad => mostramos todas las del docente en este momento, y las del espacio en este momento
  if (actividades_posibles == 0) {
    irregularidad = true;
    req.session.user.estado = valoresAsistencia[1];

    for (let i = 0; i < actividades_ids_esp.length; i++) {
      if (!actividades_esp_aparicion[i]) {
        actividad_ids_irregularidad.push(actividades_ids_esp[i]);
      }
    }
    
    actividades_posibles = await getActividadesPosibles(res, currentHour, actividad_ids_irregularidad);
  }

  if (actividades_posibles.length != 0) { 

    let clases_data = [];
    for (let i = 0; i < actividades_posibles.length; i++) {
      for (let j = 0; j < actividades_posibles[i].clase_ids.length; j++) {
        const id_cl = (actividades_posibles[i].clase_ids[j].id).toString();
        const api_cl_path = `/clases/${id_cl}`;
        clases_data.push((await getFromApi(api_cl_path, res, true)));
      }
    }

    let clases_info = [];
    for (let i = 0; i < clases_data.length; i++) {
      const id_asig = (clases_data[i].asignatura_id).toString();
      const api_asig_path = `/asignaturas/${id_asig}`;
      const id_gr = (clases_data[i].grupo_id).toString();
      const api_gr_path = `/grupos/${id_gr}`;
      clases_info.push({grupo: (await getFromApi(api_gr_path, res, true)), asignatura: (await getFromApi(api_asig_path, res, true)) });
    }

    let resultado = {espacio: esp_data.nombre + " " + esp_data.edificio, totp: totp,
                     hora: `${moment(currentHour + "Z", 'HH:mmZ').utcOffset(req.session.user.offset).format('HH:mm')}`, clases: [] 
                     // clases = [ { asignatura: , grupo: } ]
    };

    clases_info.forEach((clase) => {
      const str_asig = clase.asignatura.nombre + " (" + clase.asignatura.siglas + ")";
      const str_grupo = clase.grupo.curso + "º" + clase.grupo.letra;

      resultado.clases.push({asignatura: str_asig, grupo: str_grupo});
    });
      
    res.render('formulario-end', { resultado: resultado, usuario: {rol: req.session.user.rol, nombre: req.session.user.nombre, apellidos: req.session.user.apellidos}, irregularidad: irregularidad });
    return;
  }
  else {
    res.render('formulario-end', { resultado: {espacio: esp_data.nombre + " " + esp_data.edificio, totp: totp, 
                                  hora: `${moment(currentHour + "Z", 'HH:mmZ').utcOffset(req.session.user.offset).format('HH:mm')}`, clases: []}, 
                                  usuario: {rol: req.session.user.rol, nombre: req.session.user.nombre, apellidos: req.session.user.apellidos}, irregularidad: irregularidad });
  }
}

export async function postForm(req, res) {
  const espacio_id = req.session.user.espacio_id;
  let state = req.session.user.estado;
  let motivo_asist = null;
  if (req.body.sustitucion) { motivo_asist = "Sustitución"; }
  if (req.body.claseMov) { (motivo_asist != null) ? motivo_asist += ", Cambio de Aula" : motivo_asist = "Cambio de Aula"; }
  

  let data = {
    tipo_registro: "RegistroSeguimientoFormulario",
    espacioId: espacio_id,
    usuarioId: req.session.user.id,
    estado: state,
    motivo: motivo_asist
  };

  if (req.body.totp) {
    data.tipo_registro = "RegistroSeguimientoUsuario";
    data.totp = req.body.totp;
  }
  
  try {
    await sendToApiJSON(data, '/seguimiento', res, false);
  }
  catch(error) {
    let clases = he.decode(req.body.clases);
    let redo = {
      usuario: req.body.docente, 
      espacio: req.body.espacio, totp: req.body.totp, 
      hora: `${moment().utc().utcOffset(req.session.user.offset).format('HH:mm')}`, 
      clases: JSON.parse(clases)
    }
    res.render('formulario-end', {resultado: redo, error: "Datos no válidos", usuario: {rol: req.session.user.rol, nombre: req.session.user.nombre, apellidos: req.session.user.apellidos}, irregularidad: state == valoresAsistencia[1]});
    return;
  }
  
  res.render('exito', {mensaje: "Asistencia registrada con éxito"});
}

async function getActividadesPosibles(res, currentHour, actividades_ids) {
  
  let actividades_data = [];
  for (let i = 0; i < actividades_ids.length; i++) {
    const id_act = (actividades_ids[i].id).toString();
    const api_act_path = `/actividades/${id_act}`;
    actividades_data.push({id: id_act, data: (await getFromApi(api_act_path, res, true))});
  }
  
  let actividades_posibles = [];
  for (let i = 0; i < actividades_data.length; i++) {
    let act = actividades_data[i];
    let inicio = moment(act.data.tiempo_inicio, 'HH:mm');
    let hoy_hora_inicio = moment(moment.now()).utc().hours(inicio.hours()).minutes(inicio.minutes());
    inicio.utc();
    const fin = moment(act.data.tiempo_fin, 'HH:mm').utc();
    const excepcion_ids = (await getFromApi(`/excepciones/actividades/${act.id}`, res, true)).excepciones;

    if (inicio.format('HH:mm') <= currentHour && currentHour <= fin.format('HH:mm')) {
      let act_rec = (await getFromApi(`/recurrencias/actividades/${act.id}`, res, true)).recurrencias;
      
      //Comprobamos que su recurrencia caiga en la fecha actual
      for (let j = 0; j < act_rec.length; j++) {
        let rec_data = await getFromApi(`/recurrencias/${act_rec[j].id}`, res, true);

        if (isInRecurrencia(act.data, rec_data, hoy_hora_inicio.format('YYYY-MM-DD HH:mm:ss'))) {
          
          //Comprobamos que no está en una instancia de recurrencia cancelada
          let cancelada = false;

          for (let k = 0; k < excepcion_ids.length && !cancelada; k++) {
            let exc = await getFromApi(`/excepciones/${excepcion_ids[k].id}`, res, true);

            cancelada = ((exc.esta_cancelado == 'Sí' || exc.esta_reprogramado == 'Sí') && exc.fecha_inicio_act == hoy_hora_inicio.format('YYYY-MM-DDTHH:mm:00'));
          }

          if (!cancelada) {
            actividades_posibles.push(act.data);
            break;
          }
        }
      }
    }
    
    for (let j = 0; j < excepcion_ids.length; j++) {
      let exc = await getFromApi(`/excepciones/${excepcion_ids[j].id}`, res, true);
      let currentTime = moment(currentHour + 'Z', 'HH:mmZ').utc().format('YYYY-MM-DDTHH:mm:00');

      if (exc.esta_cancelado == 'No' && exc.esta_reprogramado == 'Sí' && exc.fecha_inicio_ex <= currentTime && currentTime <= exc.fecha_fin_ex) {
        actividades_posibles.push(act.data);
        break;
      }
    }
  }

  return actividades_posibles;
}
