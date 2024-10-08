import { configApi } from './config/api.js';
import { apiLogger } from '@informaticaucm/seguimiento-logger';
import { console_morgan, file_morgan } from '@informaticaucm/seguimiento-logger';
import express from 'express';
import { getConnection, connect } from './config/db.js';
import { initializeModels } from './models/index.js';

const sequelize = getConnection();
const db = await connect(sequelize).then(initializeModels);

const app = express();

// Controladores de la API
import * as api_controllers from './controllers/index.js';

apiLogger.info(`Starting api considering timezone ${configApi.timezone}`);

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
app.use(console_morgan);
app.use(file_morgan);
app.use(express.json());

// Rutas de la API
/* /espacios

    tags:
        - espacios
    summary: Devuelve los espacios gestionados
    description: Devuelve una lista de espacios
    operationId: getEspacios
    responses:
        '200':
            $ref: '#/components/responses/ListaEspacios'
    security:
        - ApiKeyAuth: []
*/
app.get(configApi.path + '/espacios', authenticateClient, async (req, res, next) => await api_controllers.getEspacios(req, res, next, db));

/* /espacios/{idEspacio}
 
    tags:
        - espacios
    summary: Devuelve los detalles de un espacio
    description: Devuelve un espacio
    operationId: getEspacioById
    parameters:
        - $ref: '#/components/parameters/idEspacio'
    responses:
        '200':
            $ref: '#/components/responses/Espacio'
    security:
        - ApiKeyAuth: []
*/
app.get(configApi.path + '/espacios/:idEspacio', authenticateClient, async (req, res, next) => await api_controllers.getEspacioById(req, res, next, db));

/* /espacios/usuarios/{idUsuario}

        tags:
        - usuarios
    summary: Devuelve cierta información de cierto usuario por su id
    description: Dada una opción, devuelve información relacionada a esta opción del usuario con id = {idUsuario}
    operationId: getEspaciosOfUsuario
    parameters:
        - $ref: '#/components/parameters/idUsuario'
    requestBody:
        $ref: '#/components/requestBodies/InfoUsuario'
    responses:
        '200':
            $ref: '#/components/responses/UsuarioInfoData'
        '400':
            description: Id suministrado no válido
        '404':
            description: Usuario no encontrado
        '422':
            description: Datos no válidos
*/
app.post(configApi.path + '/espacios/usuarios/:idUsuario', authenticateClient, async (req, res, next) => await api_controllers.getEspaciosOfUsuario(req, res, next, db));

/* /espacios/actividades/{idActividad}
      tags:
        - espacios
        - actividades
      summary: Devuelve una lista de los espacios asociados a una actividad
      description: Devuelve una lista de espacios relacionados a la actividad con id = {idActividad}
      operationId: getEspaciosOfActividad
      parameters:
        - $ref: '#/components/parameters/idActividad'
      responses:
        '200':
          $ref: '#/components/responses/EspacioListaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Actividad no encontrada
*/
app.get(configApi.path + '/espacios/actividades/:idActividad', authenticateClient, async (req, res, next) => await api_controllers.getEspacioOfActividad(req, res, next, db));

/*
  tags:
    - espacios
  summary: Devuelve un QR de un aula con un código
  description: Devuelve el QR que redirecciona al final del formulario con campos prerellenos considerando el espacio con id = {idEspacio}, y el TOTP actual de uno de los dispositivos asociados a dicho espacio 
  operationId: generateQR
  parameters:
    - $ref: '#/components/parameters/idEspacio'
  responses:
    '200':
      $ref: '#/components/responses/QREspacio'
    '400':
      description: Id suministrado no válido o error al generar el QR
    '404':
      description: El archivo no existe
    '500':
      description: Error al cargar la imagen
*/
app.get(configApi.path + '/espacios/qr/:idEspacio', authenticateClient, async (req, res, next) => await api_controllers.generateQR(req, res, next, db));

/* /dispositivos

    tags:
        - dispositivos
    summary: Devuelve los dispositivos gestionados
    description: Devuelve una lista de dispositivos
    operationId: getDispositivos
    responses:
        '200':
            $ref: '#/components/responses/ListaDispositivos'
    security:
        - ApiKeyAuth: []
*/
app.get(configApi.path + '/dispositivos', authenticateClient, async (req, res, next) => await api_controllers.getDispositivos(req, res, next, db));

/* /dispositivos

    tags:
        - dispositivos
    summary: Añade un nuevo dispositivo
    description: Añade una nuevo dispositivo al sistema
    operationId: creaDispositivo
    requestBody:
        $ref : '#/components/requestBodies/DispositivoNuevo'
    responses:
        '200':
            $ref: '#/components/responses/Dispositivo'
        '422':
            description: Datos no válidos
    security:
        - ApiKeyAuth: []
*/
app.post(configApi.path + '/dispositivos', authenticateClient, async (req, res, next) => await api_controllers.creaDispositivo(req, res, next, db, configApi));

/* /dispositivos/{idDispositivo}

    tags:
        - dispositivos
    summary: Busca un dispositivo por su id
    description: Devuelve un dispositivo
    operationId: getDispositivoById
    parameters:
        - $ref: '#/components/parameters/idDispositivo'
    responses:
        '200':
            $ref: '#/components/responses/Dispositivo'
        '400':
            description: Id suministrado no válido
        '404':
            description: Dispositivo no encontrado
    security:
        - ApiKeyAuth: []
*/
app.get(configApi.path + '/dispositivos/:idDispositivo', authenticateClient, async (req, res, next) => await api_controllers.getDispositivoById(req, res, next, db));

/* /dispositivos/{idDispositivo}

    tags:
        - dispositivos
    summary: Borra un dispositivo
    description: Borr un dispositivo
    operationId: deleteDispositivo
    parameters:
        - $ref: '#/components/parameters/idDispositivo'
    responses:
        '204':
            description: Operación exitosa
        '400':
            description: Id suministrado no válido
        '404':
            description: Dispositivo no encontrado
    security:
        - ApiKeyAuth: []
*/
app.delete(configApi.path + '/dispositivos/:idDispositivo', authenticateClient, async (req, res, next) => await api_controllers.deleteDispositivo(req, res, next, db));

/* /ping

    tags:
        - dispositivos
    summary: Devuelve la hora
    description: Devuelve la hora actual al dispositivo
    operationId: getLocalTime
    responses:
        '200':
            $ref: '#/components/responses/TimestampActual'
*/
app.get(configApi.path + '/ping', authenticateClient, async (req, res, next) => await api_controllers.getLocalTime(req, res, next, db));

/* /seguimiento

    tags:
        - seguimiento
    summary: Registra una asistencia en un espacio
    description: Registra una asistencia en un espacio
    operationId: registroAsistencia
    requestBody:
        $ref : '#/components/requestBodies/SeguimientoNuevo'
    responses:
        '200':
            $ref: '#/components/responses/ResultadoSeguimiento'
        '422':
            description: Datos no válidos
    security:
        - ApiKeyAuth: []
*/
app.post(configApi.path + '/seguimiento', authenticateClient, async (req, res, next) => await api_controllers.registroAsistencia(req, res, next, db));

/* /seguimiento/asistencias
    tags:
        - seguimiento
      summary: Devuelve las asistencias del día
      description: Devuelve una lista de asistencias con sus estados y motivos
      operationId: getAsistencias
      requestBody:
        $ref : '#/components/requestBodies/FiltroAsistencia'
      responses:
        '200':
          $ref: '#/components/responses/Asistencia'
*/
app.post(configApi.path + '/seguimiento/asistencias', authenticateClient, async (req, res, next) => await api_controllers.getAsistencias(req, res, next, db));

/* /seguimiento/asistencias/{idAsistencia}
    tags:
        - seguimiento
      summary: Devuelve la información asociada a una asistencia
      description: Devuelve la información asociada a la asistencia con id = {idAsistencia}
      operationId: getAsistenciaById
      parameters:
        - $ref: '#/components/parameters/idAsistencia'
      responses:
        '200':
          $ref: '#/components/responses/Asistencia'
        '400':
          description: Id suministrado no válido
        '404':
          description: Asistencia no encontrada
*/
app.get(configApi.path + '/seguimiento/asistencias/:idAsistencia', authenticateClient, async (req, res, next) => await api_controllers.getAsistenciaById(req, res, next, db));

/* /seguimiento/asistencias/{idAsistencia}
    tags:
        - seguimiento
      summary: Modifica la información asociada a una asistencia
      description: Devuelve la información modificada asociada a la asistencia con id = {idAsistencia}
      operationId: updateAsistenciaById
      parameters:
        - $ref: '#/components/parameters/idAsistencia'
      responses:
        '200':
          $ref: '#/components/responses/Asistencia'
        '400':
          description: Id suministrado no válido
        '404':
          description: Asistencia no encontrada
*/
app.post(configApi.path + '/seguimiento/asistencias/:idAsistencia', authenticateClient, async (req, res, next) => await api_controllers.updateAsistenciaById(req, res, next, db));

/* /ble

    tags:
        - seguimiento
    summary: Devuelve una lista de MACs de dispositivos BLE
    description: Develve la lista de MACs de dispositivos BLE para las actividades docentes a llevar a cabo en un espacio en una ventana de tiempo.
    operationId: getMacsBLE
    parameters:
        - in: query
            name: espacioId
            schema:
                type: integer
                format: int64
            required: true
            description: Id del espacio para filtrar la búsqueda
        - in: query
            name: comienzo
            schema:
                type: string
                format: date-time
            required: false
            description: Fecha y hora de comienzo para la la búsqueda. Si no se especifica, la ventana el comienzo serán 30 minutos antes de la hora actual del servidor al recibir la petición.
        - in: query
            name: fin
            schema:
                type: string
                format: date-time
            required: false
            description: Fecha y hora de fin para la la búsqueda. Si no se especifica, la ventana el comienzo serán 30 minutos después de la hora actual del servidor al recibir la petición.
    responses:
        '200':
            $ref: '#/components/responses/ListaMACsUsuarios'
        '400':
            description: Id suministrado no válido
        '404':
            description: Espacio no encontrado
        '422':
            description: Datos no válidos
    security:
        - ApiKeyAuth: []
*/
app.post(configApi.path + '/ble', authenticateClient, async (req, res, next) => await api_controllers.getMacsBLE(req, res, next, db));

/*
tags:
  - seguimiento
  summary: Registra una asistencia en un espacio dada desde un archivo csv
    description: Registra una asistencia en un espacio dada desde un archivo csv
    operationId: registroPLA
    requestBody:
      $ref: '#/components/requestBodies/SeguimientoPLA'
    responses:
      '200':
        $ref: '#/components/responses/ResultadoSeguimiento'
      '422':
        description: Datos no válidos
    security:
      - ApiKeyAuth: []
*/
app.post(configApi.path + '/pla', authenticateClient, async (req, res, next) => await api_controllers.registroPLA(req, res, next, db));

/* /login

    tags:
        - usuarios
    summary: Devuelve los parámetros de un usuario
    description: Dados un email y una contraseña válidas y en base de datos, devuelve los parámetros del usuario asociado
    operationId: authenticateUser
    requestBody:
            $ref : '#/components/requestBodies/LoginUsuario'
    responses:
        '200':
            $ref: '#/components/responses/UsuarioData'
        '422':
            description: Datos no válidos
    security:
        - ApiKeyAuth: []
    */
app.post(configApi.path + '/login', authenticateClient, async (req, res, next) => await api_controllers.authenticateUser(req, res, next, db));

/*  /usuarios
      tags:
        - usuarios
      summary: Devuelve una lista de usuarios
      description: Devuelve la lista de los usuarios de la base de datos
      operationId: getUsuarios
      responses:
        '200':
          $ref: '#/components/responses/ListaUsuarios'
*/
app.get(configApi.path + '/usuarios', authenticateClient, async (req, res, next) => await api_controllers.getUsuarios(req, res, next, db));

/* /usuarios
      tags:
        - usuarios
      summary: Crea un usuario en la base de datos
      description: Dados los datos de un usuario, y el usuario que intenta crear a dicho usuario, crea a un usuario en la base de datos.
      operationId: createUser
      requestBody:
        $ref: '#/components/requestBodies/CreateUsuario'
      responses:
        '201':
          description: Usuario creado con éxito
        '404':
          description: Usuario creador no válido
        '409':
          description: Usuario ya creado
        '422':
          description: Datos no válidos
*/
app.post(configApi.path + '/usuarios', authenticateClient, async (req, res, next) => await api_controllers.createUser(req, res, next, db));

/* /usuarios/:idUsuario

    tags:
      - usuarios
    summary: Devuelve los datos de un usuario por su id
    description: Devuelve los datos del usuario con id = {idUsuario}
    operationId: getUsuarioById
    parameters:
      - $ref: '#/components/parameters/idUsuario'
    responses:
      '200':
        $ref: '#/components/responses/Usuario'
      '400':
        description: Id suministrado no válido
      '404':
        description: Usuario no encontrado
*/
app.get(configApi.path + '/usuarios/:idUsuario', authenticateClient, async (req, res, next) => await api_controllers.getUsuarioById(req, res, next, db));

/*   /usuarios/macs/{idUsuario}:

      tags:
        - usuarios
      summary: Devuelve los datos de un usuario por su id
      description: Devuelve los datos del usuario con id = {idUsuario}
      operationId: registerMACToUsuario
      parameters:
        - $ref: '#/components/parameters/idUsuario'
      requestBody:
        $ref: '#/components/requestBodies/RegisterMAC'
      responses:
        '200':
          description: MAC registrada con éxito
        '400':
          description: Id suministrado no válido
        '404':
          description: Usuario no encontrado
        '409':
          description: MAC ya registrada
*/
app.post(configApi.path + '/usuarios/macs/:idUsuario', authenticateClient, async (req, res, next) => await api_controllers.registerMACToUsuario(req, res, next, db));
 
/* /usuarios/nfcs/{idUsuario}:

      tags:
        - usuarios
      summary: Devuelve los datos de un usuario por su id
      description: Devuelve los datos del usuario con id = {idUsuario}
      operationId: registerNFCToUsuario
      parameters:
        - $ref: '#/components/parameters/idUsuario'
      requestBody:
        $ref: '#/components/requestBodies/RegisterNFC'
      responses:
        '200':
          description: UID de NFC registrado con éxito
        '400':
          description: Id suministrado no válido
        '404':
          description: Usuario no encontrado
        '409':
          description: UID de NFC ya registrado
*/
app.post(configApi.path  + '/usuarios/nfcs/:idUsuario', authenticateClient, async (req, res, next) => await api_controllers.registerNFCToUsuario(req, res, next, db));

/* /actividades/usuarios/:idUsuario
 
    tags:
        - actividades
        - usuarios
    summary: Devuelve una lista de las actividades de un usuario por su id
    description: Devuelve una lista de las actividades del usuario con id = {idUsuario}.
    operationId: getActividadesOfUsuario
    parameters:
        - $ref: '#/components/parameters/idUsuario'
    responses:
        '200':
          $ref: '#/components/responses/ActividadUsuarioInfoData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Usuario no encontrado
    */
app.get(configApi.path + '/actividades/usuarios/:idUsuario', authenticateClient, async (req, res, next) => await api_controllers.getActividadesOfUsuario(req, res, next, db));

/* /actividades/:idActividad

    tags:
        - actividades
    summary: Devuelve información sobre una actividad por su id
    description: Devuelve un json con parámetros informativos de la actividad con id = {idActividad}ç
    operationId: getActividadById
    parameters:
        - $ref: '#/components/parameters/idActividad'
    responses:
        '200':
          $ref: '#/components/responses/Actividad'
        '400':
          description: Id suministrado no válido
        '404':
          description: Actividad no encontrada
    */
app.get(configApi.path + '/actividades/:idActividad', authenticateClient, async (req, res, next) => await api_controllers.getActividadById(req, res, next, db));

/* /actividades/espacios/:idEspacio

    tags:
        - actividades
        - espacios
    summary: Devuelve una lista de las actividades de un espacio por su id
    description: Devuelve una lista de las actividades del usuario con id = {idEspacio}.
    operationId: getActividadesOfEspacio
    parameters:
        - $ref: '#/components/parameters/idEspacio'
    responses:
        '200':
          $ref: '#/components/responses/ActividadEspacioInfoData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Espacio no encontrado
*/
app.get(configApi.path + '/actividades/espacios/:idEspacio', authenticateClient, async (req, res, next) => await api_controllers.getActividadesOfEspacio(req, res, next, db));

/* /actividades/clases/:idClase
    tags:
        - actividades
        - clases
      summary: Devuelve una lista de actividades de una clase por su id
      description: Devuelve una lista de las actividades de la clase con id = {idClase}.  
      operationId: getActividadesOfClase
      parameters:
        - $ref: '#/components/parameters/idClase'
      responses:
        '200':
          $ref: '#/components/responses/ActividadListaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Clase no encontrada
*/
app.get(configApi.path + '/actividades/clases/:idClase', authenticateClient, async (req, res, next) => await api_controllers.getActividadesOfClase(req, res, next, db));

/* /excepciones
    tags:
        - excepciones
      summary: Crea una nueva excepción en la base de datos
      description: Dados los parámetros, genera una excepción para una actividad en la base de datos
      operationId: createExcepcion
      requestBody:
        $ref: '#/components/requestBodies/CreateExcepcion'
      responses:
        '200':
          description: Excepción creada con éxito
        '400':
          description: Id suministrado no válido
        '404':
          description: Actividad no encontrada
*/
app.post(configApi.path + '/excepciones', authenticateClient, async (req, res, next) => await api_controllers.createExcepcion(req, res, next, db));

/* /excepciones/{idExcepcion}:

      tags:
        - excepciones
      summary: Devuelve información de una excepción por su id
      description: Devuelve información sobre la excepción con id = {idExcepcion}
      operationId: getExcepcionById
      parameters:
        - $ref: '#/components/parameters/idExcepcion'
      responses:
        '200':
          $ref: '#/components/responses/ExcepcionData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Excepción no encontrada
*/
app.get(configApi.path + '/excepciones/:idExcepcion', authenticateClient, async (req, res, next) => await api_controllers.getExcepcionById(req, res, next, db));

/* /excepciones/actividades/{idActividad}:

      tags:
        - excepciones
        - actividades
      summary: Devuelve una lista de excepciones de una actividad por su id
      description: Devuelve la lista de excepciones asociadas a la actividad con id = {idActividad}
      operationId: getExcepcionesOfActividad
      parameters:
        - $ref: '#/components/parameters/idActividad'
      responses:
        '200':
          $ref: '#/components/responses/ExcepcionListaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Actividad no encontrada
*/
app.get(configApi.path + '/excepciones/actividades/:idActividad', authenticateClient, async (req, res, next) => await api_controllers.getExcepcionesOfActividad(req, res, next, db));

/* /clases/:idClase

    tags:
        - clases
    summary: Devuelve información sobre una clase por su id
    description: Devuelve la asignatura y el grupo al que hace referencia la clase con id = {idClase}
    operationId: getClaseById
    parameters:
        - $ref: '#/components/parameters/idClase'
    responses:
        '200':
          $ref: '#/components/responses/ClaseData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Clase no encontrada      
*/
app.get(configApi.path + '/clases/:idClase', authenticateClient, async (req, res, next) => await api_controllers.getClaseById(req, res, next, db));

/* /clases/compose
    tags:
        - clases
        - asignaturas
        - grupos
      summary: Devuelve el id de la clase asociada a una asignatura y un grupo
      description: Devuelve la clase a la que hacen referencia una tupla (idAsignatura, idGrupo)
      operationId: getClaseByAsignaturaGrupo
      requestBody:
        $ref: '#/components/requestBodies/ComposeClase'
      responses:
        '200':
          $ref: '#/components/responses/ClaseId'
        '400':
          description: Id suministrado no válido
        '404':
          description: Clase no encontrada
*/
app.post(configApi.path + '/clases/compose', authenticateClient, async (req, res, next) => await api_controllers.getClaseOfAsignaturaGrupo(req, res, next, db));

/* /asignaturas/:idAsignatura

    tags:
        - asignaturas
    summary: Devuelve información de una asignatura por su id
    description: Devuelve información de la asignatura con id = {idAsignatura}
    operationId: getAsignaturaById
    parameters:
        - $ref: '#/components/parameters/idAsignatura'
    responses:
        '200':
          $ref: '#/components/responses/AsignaturaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Asignatura no encontrada      
*/
app.get(configApi.path + '/asignaturas/:idAsignatura',  authenticateClient, async (req, res, next) => await api_controllers.getAsignaturaById(req, res, next, db));

/* /grupos/:idGrupo

    tags:
        - grupos
    summary: Devuelve información de un grupo por su id
    description: Devuelve información del grupo con id = {idAsignatura}
    operationId: getGrupoById
    parameters:
        - $ref: '#/components/parameters/idGrupo'
    responses:
        '200':
            $ref: '#/components/responses/GrupoData'
        '400':
            description: Id suministrado no válido
        '404':
            description: Grupo no encontrado      
*/
app.get(configApi.path + '/grupos/:idGrupo', authenticateClient, async (req, res, next) => await api_controllers.getGrupoById(req, res, next, db));

/* /grupos/compose
    tags:
        - grupos
      summary: Devulve el id del grupo asociado a un curso y una letra
      description: Devuelve el grupo al que hacen referencia una tupla (curso, letra)
      operationId: getGrupoByCursoLetra
      requestBody:
        $ref: '#/components/requestBodies/ComposeGrupo'
      responses:
        '200':
          $ref: '#/components/responses/GrupoId'
        '400':
          description: Datos suministrados no válidos
        '404':
          description: Grupo no encontrado
*/
app.post(configApi.path + '/grupos/compose', authenticateClient, async (req, res, next) => await api_controllers.getGrupoByCursoLetra(req, res, next, db));

/* /recurrencias/:idRecurrencia
    tags:
        - recurrencias
      summary: Devuelve información de una recurrencia por su id
      description: Devuelve información de la recurrencia con id = {idRecurrencia}
      operationId: getRecurrenciaById
      parameters:
        - $ref: '#/components/parameters/idRecurrencia'
      responses:
        '200':
          $ref: '#/components/responses/RecurrenciaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Clase no encontrada
*/
app.get(configApi.path + '/recurrencias/:idRecurrencia', authenticateClient, async (req, res, next) => await api_controllers.getRecurrenciaById(req, res, next, db));

/* /recurrencias/actividades/:idActividad
    tags:
        - recurrencias
        - actividades
      summary: Devuelve la lista de recurrencias asociadas a una actividad
      description: Devuelve la lista de recurrencias de la actividad con id = {idActividad}.
      operationId: getRecurrenciaByActividad
      parameters:
        - $ref: '#/components/parameters/idActividad'
      responses:
        '200':
          $ref: '#/components/responses/RecurrenciaListaData'
        '400':
          description: Id suministrado no válido
        '404':
          description: Clase no encontrada
*/
app.get(configApi.path + '/recurrencias/actividades/:idActividad', authenticateClient, async (req, res, next) => await api_controllers.getRecurrenciaByActividad(req, res, next, db));

// Middleware to handle 404 and 405 errors (page not found and method not allowed)
app.use((req, res, next) => {
  // Comprobamos si existe la ruta buscada, y miramos si el método no existe
  const route = req.app._router.stack.find(layer => {
    if (layer.route) {
      const methods = layer.route.methods;
      // Devolvemos si verdaderamente se trata de un 405
      return layer.route.path === req.path && !methods[req.method.toLowerCase()];
    }
  });

  // Si es un 405, lo tratamos como tal
  if (route) {
    const err = new Error('Method Not Allowed');
    err.status = 405;
    return next(err);
  }

  // Si no lo es, solo puede ser un 404, ya que no existiría la ruta o se habría tratado
  const err = new Error('Not Found');
  err.status = 404;
  return next(err);
});

app.use((err, req, res, next) => {
  // Si se ha detectado algún error, usamos su código, si no 500
  const status = err.status || 500;
  
  const error = {
      error: err.message || 'Internal Server Error',
      code: status
  };

  // Enviamos el JSON con el código correspondiente
  res.setHeader('Content-Type', 'application/json');
  res.status(status).send(error);
});


app.listen(configApi.port, () => {
  const port_spec = (configApi.port_spec) ? ':' + configApi.port : '';
  apiLogger.info(`Api listening on port ${configApi.port} at ${configApi.protocol}://${configApi.host}${port_spec}${configApi.path}`);
});

function authenticateClient(req, res, next) {
  if (req.header('X-Token') !== undefined) {
    const [clientId, secret] = req.header('X-Token').split(':');
    if (configApi.secrets[clientId] !== undefined && secret === configApi.secrets[clientId]) {
      next();
      apiLogger.info(`Accepted with ${clientId} token`);
      return true;
    }
  }

  res.status(403).send("No Authorization");
  return false;
}

