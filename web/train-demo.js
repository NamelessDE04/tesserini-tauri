/* Percorso dimostrativo di Navigazione: lo carica l'amministratore con un tocco
   da un percorso vuoto. Dopo il caricamento è un percorso normale, modificabile ed eliminabile.
   { img: 'nome' } = immagine presa da img/demo/nome.jpg */
window.TAURI_DEMO = {
  navigazione: [
    {
      tipo: 'teoria', titolo: 'Leggere la carta topografica',
      blocchi: [
        { t: 'testo', v: '# La scala\nLa scala dice quante volte la realtà è stata rimpicciolita. Su una carta 1:25.000, 1 cm sulla carta corrisponde a 25.000 cm reali, cioè 250 m: 4 cm fanno 1 km.' },
        { img: 'nav-scala', cap: 'Scala 1:25.000 e curve di livello' },
        { t: 'testo', v: '# Le curve di livello\nUniscono i punti alla stessa quota. Il dislivello fra due curve vicine si chiama equidistanza ed è scritto a margine della carta.\n\n- curve fitte = pendio ripido\n- curve larghe = pendio dolce\n- cerchi chiusi sempre più piccoli = una cima\n\n# La legenda\nPrima di usare una carta leggi sempre la legenda: sentieri, corsi d\'acqua, edifici, vegetazione e scala grafica.' }
      ]
    },
    {
      tipo: 'teoria', titolo: 'Bussola e azimut',
      blocchi: [
        { t: 'testo', v: 'La bussola a piastra è lo strumento base del navigatore. Prima di usarla bisogna conoscerne le parti.' },
        { img: 'nav-bussola', cap: 'Le parti della bussola a piastra' },
        { t: 'testo', v: '# Che cos\'è l\'azimut\nÈ l\'angolo misurato in senso orario a partire dal Nord verso il punto che vuoi raggiungere. Va da 0° a 360°: Est è 90°, Sud 180°, Ovest 270°.' },
        { img: 'nav-azimut', cap: 'Azimut e contro-azimut' },
        { t: 'testo', v: '# Prendere un azimut\n- Punta la freccia di direzione verso l\'obiettivo\n- Ruota la ghiera finché la freccia di orientamento coincide con la parte rossa dell\'ago\n- Leggi i gradi sulla ghiera, all\'altezza della freccia di direzione\n\n# Il contro-azimut\nÈ la direzione opposta, serve per tornare indietro: aggiungi 180° se l\'azimut è minore di 180°, togli 180° se è maggiore.\n\n# Attenzione\nL\'ago viene deviato da oggetti metallici e apparecchi elettronici: tieni la bussola lontana da replica, radio, telefono e veicoli quando prendi una misura.' }
      ]
    },
    {
      tipo: 'test', titolo: 'Verifica veloce: carta e bussola', nDomande: 5, minuti: 5, soglia: 80,
      domande: [
        { testo: 'Guardando le curve di livello, quale versante della collina è più ripido?', img: 'quiz-pendii', opzioni: ['Il versante A', 'Il versante B', 'Sono uguali', 'Dalla carta non si può capire'], corretta: 0 },
        { testo: 'Quale azimut indica la freccia blu?', img: 'quiz-azimut', opzioni: ['135°', '45°', '225°', '315°'], corretta: 0 },
        { testo: 'Su una carta in scala 1:25.000, 1 cm corrisponde a:', opzioni: ['250 m', '25 m', '2,5 km', '25 km'], corretta: 0 },
        { testo: 'L\'azimut verso un punto è 60°. Il contro-azimut per tornare indietro è:', opzioni: ['240°', '120°', '300°', '60°'], corretta: 0 },
        { testo: 'L\'azimut si misura:', opzioni: ['In senso orario a partire dal Nord', 'In senso antiorario a partire dal Nord', 'In senso orario a partire dall\'Est', 'A partire dal Sud'], corretta: 0 }
      ]
    },
    {
      tipo: 'teoria', titolo: 'Muoversi sul terreno',
      blocchi: [
        { t: 'testo', v: '# Orientare la carta\nRuotala finché il suo Nord coincide con il Nord reale: così quello che vedi davanti a te è davanti a te anche sulla carta.\n\n# Misurare le distanze a piedi\nSi contano i passi doppi: ogni volta che lo stesso piede tocca terra.' },
        { img: 'nav-passo', cap: 'Il passo doppio' },
        { t: 'testo', v: 'Ognuno deve tarare il proprio passo su 100 m misurati, in piano e in salita: in salita il passo si accorcia.\n\n# Corrimano e punti d\'arresto\n- Corrimano: un elemento lineare da seguire (sentiero, torrente, recinzione) senza guardare di continuo la bussola\n- Punto d\'arresto: un elemento oltre l\'obiettivo (un incrocio, un ponte) che ti avvisa che sei andato troppo avanti' }
      ]
    },
    {
      tipo: 'pratica', titolo: 'Taratura del passo',
      blocchi: [
        { t: 'testo', v: '# Cosa fare\n- Percorri 3 volte un tratto misurato di 100 m contando i passi doppi\n- Calcola la media: è il tuo numero di passi doppi ogni 100 m\n- Ripeti la prova in salita\n\n# Per superarla\nSu un tratto di verifica scelto dall\'istruttore, la tua stima della distanza deve sbagliare al massimo del 5%.' }
      ]
    },
    {
      tipo: 'pratica', titolo: 'Navigazione ad azimut',
      blocchi: [
        { t: 'testo', v: '# Cosa fare\nL\'istruttore ti dà 3 tappe, ognuna con azimut e distanza. Raggiungile in sequenza usando solo bussola e passo doppio.\n\n# Per superarla\nErrore massimo all\'arrivo: 20 m per ogni tappa.' }
      ]
    },
    {
      tipo: 'pratica', titolo: 'Percorso con carta e bussola',
      blocchi: [
        { t: 'testo', v: '# Cosa fare\nPartendo da un punto noto, trova 4 punti segnati sulla carta, senza GPS né telefono.\n\n# Per superarla\nTutti e 4 i punti in 40 minuti.' }
      ]
    },
    {
      tipo: 'test', titolo: 'Test finale di Navigazione', nDomande: 10, minuti: 15, soglia: 80,
      domande: [
        { testo: 'Su una carta in scala 1:25.000, 1 cm corrisponde a:', opzioni: ['250 m', '25 m', '2,5 km', '25 km'], corretta: 0 },
        { testo: 'Su una carta 1:25.000 due punti distano 6 cm. Nella realtà distano circa:', opzioni: ['1,5 km', '150 m', '15 km', '600 m'], corretta: 0 },
        { testo: 'Guardando le curve di livello, quale versante della collina è più ripido?', img: 'quiz-pendii', opzioni: ['Il versante A', 'Il versante B', 'Sono uguali', 'Dalla carta non si può capire'], corretta: 0 },
        { testo: 'Curve di livello molto ravvicinate indicano:', opzioni: ['Un pendio ripido', 'Una pianura', 'Un corso d\'acqua', 'Un bosco fitto'], corretta: 0 },
        { testo: 'Quale azimut indica la freccia blu?', img: 'quiz-azimut', opzioni: ['135°', '45°', '225°', '315°'], corretta: 0 },
        { testo: 'L\'azimut verso un punto è 300°. Il contro-azimut è:', opzioni: ['120°', '210°', '30°', '480°'], corretta: 0 },
        { testo: 'Perché bisogna tenere la bussola lontana da oggetti metallici?', opzioni: ['Perché deviano l\'ago magnetico', 'Perché la scaricano', 'Perché rovinano la ghiera', 'Non serve, la bussola non ne risente'], corretta: 0 },
        { testo: 'Il passo doppio si conta:', opzioni: ['Ogni volta che lo stesso piede tocca terra', 'Ogni volta che un piede qualsiasi tocca terra', 'Ogni 10 metri', 'Ogni volta che si cambia direzione'], corretta: 0 },
        { testo: 'Orientare la carta significa:', opzioni: ['Ruotarla finché il suo Nord coincide con il Nord reale', 'Segnare le coordinate del punto in cui si è', 'Piegarla nel verso giusto', 'Tenerla sempre con il testo leggibile'], corretta: 0 },
        { testo: 'La declinazione magnetica è:', opzioni: ['La differenza tra Nord geografico e Nord magnetico', 'L\'errore dovuto a un passo troppo lungo', 'L\'inclinazione del terreno', 'L\'angolo tra due curve di livello'], corretta: 0 },
        { testo: 'In navigazione, un "corrimano" è:', opzioni: ['Un elemento lineare da seguire, come un sentiero o un torrente', 'Una corda per i passaggi difficili', 'Il punto di partenza', 'La freccia di direzione della bussola'], corretta: 0 },
        { testo: 'Un punto d\'arresto serve a:', opzioni: ['Capire quando si è superato l\'obiettivo', 'Fare una pausa obbligatoria', 'Tarare la bussola', 'Segnare il Nord sulla carta'], corretta: 0 },
        { testo: 'In salita, rispetto al piano, il passo doppio di solito:', opzioni: ['Si accorcia: servono più passi per 100 m', 'Si allunga', 'Resta identico', 'Non si può misurare'], corretta: 0 },
        { testo: 'Per seguire un azimut già impostato sulla ghiera devi:', opzioni: ['Ruotare su te stesso finché l\'ago rosso coincide con la freccia di orientamento, poi seguire la freccia di direzione', 'Puntare l\'ago rosso verso l\'obiettivo', 'Tenere la bussola vicino alla replica', 'Seguire la freccia di orientamento'], corretta: 0 }
      ]
    }
  ]
};
