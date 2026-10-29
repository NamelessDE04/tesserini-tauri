/* Contenuti iniziali di esempio dei percorsi di addestramento.
   Si usano solo finché un istruttore non salva la versione definitiva del percorso nel database. */
window.TAURI_SEED = {
  navigazione: {
    bozza: true,
    quiz: { nDomande: 10, soglia: 80, minuti: 15 },
    teoria: [
      {
        id: 't1', titolo: 'La carta topografica',
        testo: 'La scala indica quante volte la realtà è stata rimpicciolita. Su una carta 1:25.000, 1 cm sulla carta corrisponde a 25.000 cm reali, cioè 250 m: 4 cm fanno 1 km.\n\n' +
          'Le curve di livello uniscono i punti alla stessa quota. La distanza in altezza fra due curve vicine si chiama equidistanza ed è indicata a margine della carta. Curve molto ravvicinate indicano un pendio ripido, curve distanziate un terreno dolce.\n\n' +
          'Prima di usare una carta leggi sempre la legenda: simboli di sentieri, corsi d\'acqua, edifici, vegetazione e la scala grafica.'
      },
      {
        id: 't2', titolo: 'La bussola e l\'azimut',
        testo: 'L\'azimut è l\'angolo, misurato in senso orario a partire dal Nord, tra il Nord e la direzione verso un punto. Va da 0° a 360°: Est è 90°, Sud 180°, Ovest 270°.\n\n' +
          'Il contro-azimut è la direzione opposta, utile per tornare indietro: si ottiene aggiungendo 180° se l\'azimut è minore di 180°, togliendo 180° se è maggiore.\n\n' +
          'L\'ago magnetico viene deviato da oggetti metallici e campi elettrici: tieni la bussola lontana da armi, radio, telefono e veicoli quando prendi una misura.\n\n' +
          'La declinazione magnetica è la differenza tra Nord geografico e Nord magnetico. In Nord Italia è di pochi gradi e sulle brevi distanze di gioco spesso si trascura, ma va conosciuta.'
      },
      {
        id: 't3', titolo: 'Orientarsi e muoversi',
        testo: 'Orientare la carta significa ruotarla finché il suo Nord coincide con il Nord reale: così ciò che vedi davanti a te è anche davanti a te sulla carta.\n\n' +
          'Per misurare le distanze a piedi si contano i passi doppi (ogni volta che lo stesso piede tocca terra). Ognuno deve tarare il proprio passo su 100 m misurati, in piano e in salita.\n\n' +
          'Usa i corrimano (sentieri, torrenti, recinzioni, linee elettriche) per seguire una direzione senza consultare continuamente la bussola, e i punti d\'arresto (un incrocio, un ponte) per capire quando hai superato l\'obiettivo.'
      }
    ],
    pratica: [
      { id: 'p1', titolo: 'Taratura del passo', criterio: 'Percorri 3 volte un tratto misurato di 100 m contando i passi doppi e calcola la media. Su un tratto di verifica sconosciuto, la stima deve sbagliare al massimo del 5%.' },
      { id: 'p2', titolo: 'Navigazione ad azimut', criterio: 'Raggiungi 3 punti in sequenza usando solo azimut e distanza forniti dall\'istruttore. Errore massimo all\'arrivo: 20 m per ogni tappa.' },
      { id: 'p3', titolo: 'Percorso con carta e bussola', criterio: 'Trova 4 punti segnati sulla carta in 40 minuti, senza GPS né telefono, partendo da un punto noto.' }
    ],
    domande: [
      { id: 'q1', testo: 'Su una carta in scala 1:25.000, 1 cm corrisponde a:', opzioni: ['250 m', '25 m', '2,5 km', '25 km'], corretta: 0 },
      { id: 'q2', testo: 'Su una carta 1:25.000 due punti distano 6 cm. Nella realtà distano circa:', opzioni: ['1,5 km', '150 m', '15 km', '600 m'], corretta: 0 },
      { id: 'q3', testo: 'Curve di livello molto ravvicinate indicano:', opzioni: ['Un pendio ripido', 'Una pianura', 'Un corso d\'acqua', 'Un bosco fitto'], corretta: 0 },
      { id: 'q4', testo: 'L\'azimut si misura:', opzioni: ['In senso orario a partire dal Nord', 'In senso antiorario a partire dal Nord', 'In senso orario a partire dall\'Est', 'A partire dal Sud'], corretta: 0 },
      { id: 'q5', testo: 'L\'azimut verso un punto è 60°. Il contro-azimut per tornare indietro è:', opzioni: ['240°', '120°', '300°', '60°'], corretta: 0 },
      { id: 'q6', testo: 'L\'azimut verso un punto è 300°. Il contro-azimut è:', opzioni: ['120°', '210°', '30°', '480°'], corretta: 0 },
      { id: 'q7', testo: 'Perché bisogna tenere la bussola lontana da oggetti metallici?', opzioni: ['Perché deviano l\'ago magnetico', 'Perché la scaricano', 'Perché rovinano la ghiera', 'Non serve, la bussola non ne risente'], corretta: 0 },
      { id: 'q8', testo: 'Il passo doppio si conta:', opzioni: ['Ogni volta che lo stesso piede tocca terra', 'Ogni volta che un piede qualsiasi tocca terra', 'Ogni 10 metri', 'Ogni volta che si cambia direzione'], corretta: 0 },
      { id: 'q9', testo: 'Orientare la carta significa:', opzioni: ['Ruotarla finché il suo Nord coincide con il Nord reale', 'Segnare le coordinate del punto in cui si è', 'Piegarla nel verso giusto', 'Tenerla sempre con il testo leggibile'], corretta: 0 },
      { id: 'q10', testo: 'La declinazione magnetica è:', opzioni: ['La differenza tra Nord geografico e Nord magnetico', 'L\'errore dovuto a un passo troppo lungo', 'L\'inclinazione del terreno', 'L\'angolo tra due curve di livello'], corretta: 0 },
      { id: 'q11', testo: 'In navigazione, un "corrimano" è:', opzioni: ['Un elemento lineare da seguire, come un sentiero o un torrente', 'Una corda per i passaggi difficili', 'Il punto di partenza', 'La linea di fede della bussola'], corretta: 0 },
      { id: 'q12', testo: 'Un punto d\'arresto serve a:', opzioni: ['Capire quando si è superato l\'obiettivo', 'Fare una pausa obbligatoria', 'Tarare la bussola', 'Segnare il Nord sulla carta'], corretta: 0 }
    ]
  }
};
