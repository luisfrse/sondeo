/* Idiomes: català (ca) i castellà (es). Per afegir-ne un altre, copia un bloc i tradueix-lo. */
(function(){
  var D = {
    ca: {
      app:'Sondeo', untitled:'Pregunta sense títol',
      /* professor */
      edit_title:'Sondeo · Preparar sessió', badge:'Participació en directe',
      intro:'Crea les diapositives, comença la sessió i els alumnes participen des del mòbil escanejant el QR. No es guarda cap nom: les respostes són anònimes i s\'esborren en acabar.',
      t_poll:'Votació', t_nube:'Núvol de paraules', t_text:'Resposta oberta', t_escala:'Escala 1-5', t_preguntes:'Mur de preguntes',
      add_poll:'+ Votació', add_nube:'+ Núvol de paraules', add_text:'+ Resposta oberta', add_escala:'+ Escala 1-5', add_preguntes:'+ Mur de preguntes',
      pw_label:'Contrasenya de professor', start:'Començar sessió', export:'Exportar', import:'Importar', example:'Carregar exemple',
      saved_note:'Les diapositives es guarden en aquest navegador. Exporta un fitxer si vols usar-les en un altre ordinador.',
      question:'Pregunta', opts_label:'Opcions (una per línia, de 2 a 10)', max_words:'Paraules màximes per alumne', lo_label:'Etiqueta de l\'1', hi_label:'Etiqueta del 5',
      del_slide:'Esborrar diapositiva', confirm_replace:'Això substituirà les diapositives actuals.', bad_file:'Fitxer no vàlid.',
      prev:'Anterior', next:'Següent', close_resp:'Tancar respostes', open_resp:'Obrir respostes', clear:'Esborrar respostes', auto:'Obrir en canviar',
      fs:'Pantalla completa', end:'Acabar sessió', qr_alt:'Codi QR per entrar a la sessió',
      confirm_clear:'Esborrar les respostes d\'aquesta diapositiva?', confirm_end:'Acabar la sessió? S\'esborraran totes les respostes.',
      n_students:'{n} alumnes', n_student1:'1 alumne', st_open:'● Respostes obertes', st_closed:'○ Respostes tancades',
      n_part:'{n} participants', n_part1:'1 participant', mean:'Mitjana {v}', mean_none:'Mitjana –',
      hidden:'(amagat)', hide:'Amagar', show:'Mostrar', highlight:'Destacar', done:'Respost', undone:'Desmarcar', votes:'{n} vots', no_q:'Encara no hi ha preguntes.',
      lang:'Idioma',
      login_title:'Accés de professor', login_help:'Introdueix el teu codi d\'invitació.', code_ph:'XXXXX-XXXXX', remember:'Recorda\'m en aquest ordinador', login_btn:'Entrar',
      no_code:'Si no tens codi, demana\'l des de l\'apartat de contacte de la web.', contact_link:'Anar a la pàgina de contacte', bad_code:'Codi no vàlid, revocat o caducat.',
      err_auth:'Sessió caducada. Torna a entrar amb el codi.', err_limit:'Ja tens el màxim de sessions obertes. Tanca\'n alguna.', hello:'Sessió de {n}', logout:'Sortir',
      a_title:'Sondeo · Codis d\'invitació', a_person:'Persona', a_person_ph:'Ex.: Ana López (IES Mataró)', a_expires:'Caduca (opcional)', a_create:'Crear codi', a_code:'Codi', a_created:'Creat', a_last:'Últim ús', a_sessions:'Sessions', a_live:'En directe', a_state:'Estat',
      a_copy:'Copiar', a_invite:'Invitació', a_copied:'Copiat!', a_revoke:'Revocar', a_react:'Reactivar', a_delete:'Esborrar', a_none:'Encara no has creat cap codi.', a_never:'mai',
      a_confirm_revoke:'Revocar el codi de {n}? Deixarà de funcionar i es tancaran les seves sessions obertes.', a_confirm_del:'Esborrar definitivament el codi de {n}?',
      a_msg:'Hola, aquí tens el teu codi per usar Sondeo gratis: {c}\nEntra a {u} i introdueix-lo (no cal registrar-se).',
      a_status:'{s} sessions actives · {a} alumnes connectats', s_actiu:'actiu', s_revocat:'revocat', s_caducat:'caducat', err_label:'Escriu a qui correspon el codi.', err_date:'Data de caducitat no vàlida.',
      err_pw:'Contrasenya incorrecta.', err_many:'Massa intents. Espera uns minuts.', err_sessions:'Hi ha massa sessions obertes.', err_noslides:'Afegeix almenys una diapositiva.', err_bad:'Petició incorrecta.', err_net:'No s\'ha pogut connectar amb el servidor.',
      /* alumne */
      enter_code:'Introdueix el codi', code_help:'El veus a la pantalla del professor.', enter:'Entrar', code_bad:'Aquest codi no existeix.',
      connecting:'Connectant…', code_pill:'Codi {c}', reconnecting:'Reconnectant…', closed:'Tancada',
      waiting:'Esperant el professor…', sent:'Resposta enviada ✓', vote_closed:'Votació tancada', closed_msg:'El professor ha tancat les respostes d\'aquesta pregunta.', next_wait:'Espera la propera pregunta.',
      sent_change:'Resposta enviada ✓  (pots canviar-la)', word_n:'Paraula {n}', send:'Enviar', update:'Actualitzar', sent_ok:'Enviat ✓',
      write_ph:'Escriu la teva resposta…', sent_msgs:'Enviat ✓  ({n}/3 missatges; pots enviar-ne més)', max_msgs:'Has arribat al màxim de missatges.',
      n_answers:'{n} respostes', n_answer1:'1 resposta',
      ask_ph:'Escriu la teva pregunta…', ask_send:'Enviar pregunta', ask_left:'Pots fer {n} pregunta(es) més.', ask_none:'Has fet el màxim de preguntes (3).', vote:'Vot', voted:'Votat', own:'La teva pregunta', answered:'Respost ✓',
      e_notfound:'Aquesta sessió no existeix', e_full:'Sessió plena', e_ended:'La sessió ha acabat', thanks:'Gràcies per participar!',
      example_slides:[
        { type:'poll', q:'Com et sents avui?', opts:['Genial','Bé','Normal','Cansat/da'] },
        { type:'nube', q:'Una paraula que associïs amb el tema d\'avui', max:3 },
        { type:'escala', q:'Quant domines aquest contingut?', lo:'Gens', hi:'Molt' },
        { type:'text', q:'Què t\'ha sorprès més?' },
        { type:'preguntes', q:'Quins dubtes tens? Vota els dels companys' }
      ]
    },
    es: {
      app:'Sondeo', untitled:'Pregunta sin título',
      edit_title:'Sondeo · Preparar sesión', badge:'Participación en directo',
      intro:'Crea las diapositivas, empieza la sesión y los alumnos participan desde el móvil escaneando el QR. No se guarda ningún nombre: las respuestas son anónimas y se borran al terminar.',
      t_poll:'Votación', t_nube:'Nube de palabras', t_text:'Respuesta abierta', t_escala:'Escala 1-5', t_preguntes:'Muro de preguntas',
      add_poll:'+ Votación', add_nube:'+ Nube de palabras', add_text:'+ Respuesta abierta', add_escala:'+ Escala 1-5', add_preguntes:'+ Muro de preguntas',
      pw_label:'Contraseña de profesor', start:'Empezar sesión', export:'Exportar', import:'Importar', example:'Cargar ejemplo',
      saved_note:'Las diapositivas se guardan en este navegador. Exporta un archivo si quieres usarlas en otro ordenador.',
      question:'Pregunta', opts_label:'Opciones (una por línea, de 2 a 10)', max_words:'Palabras máximas por alumno', lo_label:'Etiqueta del 1', hi_label:'Etiqueta del 5',
      del_slide:'Borrar diapositiva', confirm_replace:'Esto sustituirá las diapositivas actuales.', bad_file:'Archivo no válido.',
      prev:'Anterior', next:'Siguiente', close_resp:'Cerrar respuestas', open_resp:'Abrir respuestas', clear:'Borrar respuestas', auto:'Abrir al cambiar',
      fs:'Pantalla completa', end:'Terminar sesión', qr_alt:'Código QR para entrar en la sesión',
      confirm_clear:'¿Borrar las respuestas de esta diapositiva?', confirm_end:'¿Terminar la sesión? Se borrarán todas las respuestas.',
      n_students:'{n} alumnos', n_student1:'1 alumno', st_open:'● Respuestas abiertas', st_closed:'○ Respuestas cerradas',
      n_part:'{n} participantes', n_part1:'1 participante', mean:'Media {v}', mean_none:'Media –',
      hidden:'(oculto)', hide:'Ocultar', show:'Mostrar', highlight:'Destacar', done:'Respondida', undone:'Desmarcar', votes:'{n} votos', no_q:'Todavía no hay preguntas.',
      lang:'Idioma',
      login_title:'Acceso de profesor', login_help:'Introduce tu código de invitación.', code_ph:'XXXXX-XXXXX', remember:'Recordarme en este ordenador', login_btn:'Entrar',
      no_code:'Si no tienes código, pídelo desde el apartado de contacto de la web.', contact_link:'Ir a la página de contacto', bad_code:'Código no válido, revocado o caducado.',
      err_auth:'Sesión caducada. Vuelve a entrar con tu código.', err_limit:'Ya tienes el máximo de sesiones abiertas. Cierra alguna.', hello:'Sesión de {n}', logout:'Salir',
      a_title:'Sondeo · Códigos de invitación', a_person:'Persona', a_person_ph:'Ej.: Ana López (IES Mataró)', a_expires:'Caduca (opcional)', a_create:'Crear código', a_code:'Código', a_created:'Creado', a_last:'Último uso', a_sessions:'Sesiones', a_live:'En directo', a_state:'Estado',
      a_copy:'Copiar', a_invite:'Invitación', a_copied:'¡Copiado!', a_revoke:'Revocar', a_react:'Reactivar', a_delete:'Borrar', a_none:'Todavía no has creado ningún código.', a_never:'nunca',
      a_confirm_revoke:'¿Revocar el código de {n}? Dejará de funcionar y se cerrarán sus sesiones abiertas.', a_confirm_del:'¿Borrar definitivamente el código de {n}?',
      a_msg:'Hola, aquí tienes tu código para usar Sondeo gratis: {c}\nEntra en {u} e introdúcelo (no hace falta registrarse).',
      a_status:'{s} sesiones activas · {a} alumnos conectados', s_actiu:'activo', s_revocat:'revocado', s_caducat:'caducado', err_label:'Escribe a quién corresponde el código.', err_date:'Fecha de caducidad no válida.',
      err_pw:'Contraseña incorrecta.', err_many:'Demasiados intentos. Espera unos minutos.', err_sessions:'Hay demasiadas sesiones abiertas.', err_noslides:'Añade al menos una diapositiva.', err_bad:'Petición incorrecta.', err_net:'No se ha podido conectar con el servidor.',
      enter_code:'Introduce el código', code_help:'Lo ves en la pantalla del profesor.', enter:'Entrar', code_bad:'Este código no existe.',
      connecting:'Conectando…', code_pill:'Código {c}', reconnecting:'Reconectando…', closed:'Cerrada',
      waiting:'Esperando al profesor…', sent:'Respuesta enviada ✓', vote_closed:'Votación cerrada', closed_msg:'El profesor ha cerrado las respuestas de esta pregunta.', next_wait:'Espera a la siguiente pregunta.',
      sent_change:'Respuesta enviada ✓  (puedes cambiarla)', word_n:'Palabra {n}', send:'Enviar', update:'Actualizar', sent_ok:'Enviado ✓',
      write_ph:'Escribe tu respuesta…', sent_msgs:'Enviado ✓  ({n}/3 mensajes; puedes enviar más)', max_msgs:'Has llegado al máximo de mensajes.',
      n_answers:'{n} respuestas', n_answer1:'1 respuesta',
      ask_ph:'Escribe tu pregunta…', ask_send:'Enviar pregunta', ask_left:'Puedes hacer {n} pregunta(s) más.', ask_none:'Has hecho el máximo de preguntas (3).', vote:'Voto', voted:'Votado', own:'Tu pregunta', answered:'Respondida ✓',
      e_notfound:'Esta sesión no existe', e_full:'Sesión llena', e_ended:'La sesión ha terminado', thanks:'¡Gracias por participar!',
      example_slides:[
        { type:'poll', q:'¿Cómo te sientes hoy?', opts:['Genial','Bien','Normal','Cansado/a'] },
        { type:'nube', q:'Una palabra que asocies con el tema de hoy', max:3 },
        { type:'escala', q:'¿Cuánto dominas este contenido?', lo:'Nada', hi:'Mucho' },
        { type:'text', q:'¿Qué te ha sorprendido más?' },
        { type:'preguntes', q:'¿Qué dudas tienes? Vota las de tus compañeros' }
      ]
    }
  };
  var lang = 'ca';
  try { lang = localStorage.getItem('sondeo.lang') || ''; } catch(_) {}
  if (!D[lang]) lang = /^es/i.test(navigator.language || '') ? 'es' : 'ca';
  window.I18N = {
    get lang(){ return lang; },
    set: function(l){ if(D[l]){ lang = l; try { localStorage.setItem('sondeo.lang', l); } catch(_) {} document.documentElement.lang = l; } },
    t: function(k, v){ var s = (D[lang][k] != null ? D[lang][k] : D.ca[k]); if(s == null) return k; if(typeof s !== 'string') return s; if(v) Object.keys(v).forEach(function(x){ s = s.replace('{' + x + '}', v[x]); }); return s; },
    langs: Object.keys(D)
  };
  document.documentElement.lang = lang;
})();
