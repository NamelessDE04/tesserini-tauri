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
          '[[fig:nav-scala]]\n\n' +
          'Prima di usare una carta leggi sempre la legenda: simboli di sentieri, corsi d\'acqua, edifici, vegetazione e la scala grafica.'
      },
      {
        id: 't2', titolo: 'La bussola e l\'azimut',
        testo: 'L\'azimut è l\'angolo, misurato in senso orario a partire dal Nord, tra il Nord e la direzione verso un punto. Va da 0° a 360°: Est è 90°, Sud 180°, Ovest 270°.\n\n' +
          'Il contro-azimut è la direzione opposta, utile per tornare indietro: si ottiene aggiungendo 180° se l\'azimut è minore di 180°, togliendo 180° se è maggiore.\n\n' +
          '[[fig:nav-azimut]]\n\n' +
          '[[fig:nav-bussola]]\n\n' +
          'L\'ago magnetico viene deviato da oggetti metallici e campi elettrici: tieni la bussola lontana da armi, radio, telefono e veicoli quando prendi una misura.\n\n' +
          'La declinazione magnetica è la differenza tra Nord geografico e Nord magnetico. In Nord Italia è di pochi gradi e sulle brevi distanze di gioco spesso si trascura, ma va conosciuta.'
      },
      {
        id: 't3', titolo: 'Orientarsi e muoversi',
        testo: 'Orientare la carta significa ruotarla finché il suo Nord coincide con il Nord reale: così ciò che vedi davanti a te è anche davanti a te sulla carta.\n\n' +
          'Per misurare le distanze a piedi si contano i passi doppi (ogni volta che lo stesso piede tocca terra). Ognuno deve tarare il proprio passo su 100 m misurati, in piano e in salita.\n\n' +
          '[[fig:nav-passo]]\n\n' +
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
  },
  meccanica: {
    bozza: true,
    quiz: { nDomande: 10, soglia: 80, minuti: 15 },
    teoria: [
      {
        id: 't1', titolo: 'Sicurezza e regole',
        testo: 'Prima di qualsiasi intervento metti in sicurezza la replica: sicura inserita, caricatore tolto, batteria scollegata (o bombola/gas scaricato nelle GBB), un colpo a vuoto in direzione sicura per liberare la camera. Indossa sempre le protezioni per gli occhi anche al banco.\n\n' +
          '[[fig:mec-sicurezza]]\n\n' +
          'In Italia le repliche softair devono restare sotto 1 joule di energia alla volata; molti campi applicano limiti più bassi e regole diverse per ruolo (assalto, supporto, tiratore scelto). L\'energia si calcola con E = ½ · m · v²: con pallini da 0,20 g a 100 m/s si ha 1 J.\n\n' +
          'Dopo ogni modifica alla molla o alla compressione la replica va ricontrollata al cronografo, con il peso di pallino previsto dal campo.'
      },
      {
        id: 't2', titolo: 'Come funziona un\'AEG',
        testo: 'Premendo il grilletto si chiudono i contatti: il motore gira e il suo pignone muove gli ingranaggi del gearbox (bevel, spur e sector). Il sector, con i suoi denti, tira indietro il pistone comprimendo la molla.\n\n' +
          'Quando il dente lascia il pistone, la molla lo spinge in avanti: la testa del pistone comprime l\'aria nel cilindro, che passa dalla testa del cilindro al nozzle e spinge il pallino lungo la canna.\n\n' +
          '[[fig:mec-ciclo]]\n\n' +
          '[[3d:gearbox]]\n\n' +
          'Il tappet plate fa arretrare il nozzle per far entrare un nuovo pallino in camera. L\'anti-reversal latch impedisce agli ingranaggi di girare all\'indietro sotto la spinta della molla. Il cut-off lever interrompe i contatti dopo un colpo quando si spara in semiautomatico.\n\n' +
          'Il gearbox più diffuso è il versione 2 (repliche tipo M4/AR15); il versione 3 è tipico delle repliche AK.'
      },
      {
        id: 't3', titolo: 'Hop-up, canna, batterie e manutenzione',
        testo: 'L\'hop-up, con il gommino (bucking) e il nub, imprime al pallino una rotazione all\'indietro (backspin): per effetto Magnus il pallino "galleggia" e il tiro si allunga. Poco hop-up = il pallino cade presto; troppo hop-up = il pallino sale e fa la "banana". Si regola per avere un tiro il più possibile piatto alla distanza d\'uso, con il peso di pallino che si usa davvero.\n\n' +
          '[[fig:mec-hopup]]\n\n' +
          'La canna interna e il gommino vanno tenuti puliti e asciutti: si puliscono con una bacchetta e un panno, senza grasso. Il grasso va sugli ingranaggi; per la guarnizione del pistone e il cilindro si usa grasso o olio al silicone, in piccole quantità.\n\n' +
          'Lo spessoramento (shimming) riduce il gioco degli ingranaggi e la correzione dell\'AOE (angolo con cui il sector incontra il pistone) riduce l\'usura del gearbox.\n\n' +
          'Batterie: le LiPo (7,4 V o 11,1 V) danno più spinta delle NiMH ma vanno trattate con cura: mai scaricarle del tutto, conservarle alla tensione di storage (circa 3,8 V per cella) e mai usarle se gonfie. Con tensioni alte è consigliato un MOSFET, che protegge i contatti del grilletto.'
      }
    ],
    pratica: [
      { id: 'p1', titolo: 'Messa in sicurezza e smontaggio da campo', criterio: 'Davanti all\'istruttore: mette in sicurezza la replica nell\'ordine corretto, la smonta da campo, pulisce la canna interna e la rimonta funzionante entro 15 minuti.' },
      { id: 'p2', titolo: 'Regolazione hop-up e cronografo', criterio: 'Regola l\'hop-up per un tiro piatto a 30 m con il peso di pallino del campo, poi misura la replica al cronografo e calcola l\'energia: deve rientrare nei limiti del campo.' },
      { id: 'p3', titolo: 'Apertura del gearbox e diagnosi', criterio: 'Apre un gearbox versione 2, nomina tutti i componenti principali, individua il guasto preparato dall\'istruttore, rimonta e verifica il funzionamento in semi e in automatico.' }
    ],
    domande: [
      { id: 'q1', testo: 'Prima di aprire o smontare un\'AEG bisogna:', opzioni: ['Togliere caricatore e batteria e sparare a vuoto in direzione sicura', 'Solo inserire la sicura', 'Togliere solo il caricatore', 'Scaricare la molla tenendo premuto il grilletto con la batteria collegata'], corretta: 0 },
      { id: 'q2', testo: 'In Italia l\'energia massima di una replica softair alla volata è:', opzioni: ['1 joule', '3 joule', '7,5 joule', '0,5 joule'], corretta: 0 },
      { id: 'q3', testo: 'Con pallini da 0,20 g a 100 m/s l\'energia è circa:', opzioni: ['1,0 J', '0,5 J', '2,0 J', '10 J'], corretta: 0 },
      { id: 'q4', testo: 'L\'hop-up serve a:', opzioni: ['Dare al pallino una rotazione all\'indietro per allungare il tiro', 'Aumentare la cadenza di fuoco', 'Ridurre il rumore dello sparo', 'Alimentare i pallini dal caricatore'], corretta: 0 },
      { id: 'q5', testo: 'I pallini salgono e fanno la "banana" verso l\'alto. Cosa fai?', opzioni: ['Riduco l\'hop-up', 'Aumento l\'hop-up', 'Cambio la batteria', 'Uso pallini più leggeri'], corretta: 0 },
      { id: 'q6', testo: 'Quale componente tira indietro il pistone comprimendo la molla?', opzioni: ['Il sector gear', 'Il tappet plate', 'Il nozzle', 'La testa del cilindro'], corretta: 0 },
      { id: 'q7', testo: 'A cosa serve il tappet plate?', opzioni: ['A far arretrare il nozzle per caricare il pallino in camera', 'A bloccare gli ingranaggi', 'A chiudere i contatti del grilletto', 'A regolare l\'hop-up'], corretta: 0 },
      { id: 'q8', testo: 'L\'anti-reversal latch serve a:', opzioni: ['Impedire agli ingranaggi di girare all\'indietro', 'Passare da semi ad automatico', 'Trattenere il caricatore', 'Proteggere la batteria'], corretta: 0 },
      { id: 'q9', testo: 'Cosa NON va mai lubrificato con grasso?', opzioni: ['La canna interna e il gommino hop-up', 'Gli ingranaggi', 'La guarnizione del pistone', 'Le boccole'], corretta: 0 },
      { id: 'q10', testo: 'Lo spessoramento (shimming) degli ingranaggi serve a:', opzioni: ['Ridurre il loro gioco e l\'usura', 'Aumentare la potenza', 'Cambiare la cadenza del semiautomatico', 'Regolare l\'hop-up'], corretta: 0 },
      { id: 'q11', testo: 'Il gearbox versione 2 è tipico delle repliche:', opzioni: ['M4 / AR15', 'AK', 'Fucili a pompa', 'Pistole a gas'], corretta: 0 },
      { id: 'q12', testo: 'Perché si monta un MOSFET su un\'AEG alimentata a LiPo?', opzioni: ['Per proteggere i contatti del grilletto dalla corrente', 'Per aumentare i joule', 'Per caricare la batteria', 'Per regolare l\'hop-up'], corretta: 0 },
      { id: 'q13', testo: 'Una batteria LiPo va conservata:', opzioni: ['Alla tensione di storage, circa 3,8 V per cella', 'Completamente scarica', 'Sempre carica al massimo', 'Collegata alla replica'], corretta: 0 },
      { id: 'q14', testo: 'Dopo aver cambiato la molla, prima di giocare devi:', opzioni: ['Ricontrollare la replica al cronografo', 'Solo provarla in cortile', 'Aumentare l\'hop-up al massimo', 'Niente, la molla non cambia l\'energia'], corretta: 0 }
    ]
  }
};
