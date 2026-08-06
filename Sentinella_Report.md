# Sentinella

### Agente autonomo di soccorso parametrico per il rischio idrogeologico, su Solana

**ctrl/shift Hackathon 2026 — Track: Solana · Blockchain for Good Alliance (+ Terna, Mood, SiteLab)**

> Un agente AI autonomo che monitora il rischio di frana in tempo reale e, al superamento di soglie climatiche prestabilite, eroga automaticamente fondi di soccorso in USDC direttamente ai portafogli delle comunità colpite. Ogni decisione e ogni pagamento sono registrati e verificabili on-chain.

---

## 1. Sintesi esecutiva

Quando una catastrofe idrogeologica colpisce un territorio, il problema più urgente non è solo prevederla, ma far arrivare i soccorsi *in tempo*. I meccanismi tradizionali di indennizzo e aiuto — perizie, valutazione del danno, approvazioni burocratiche — impiegano settimane o mesi, proprio quando le famiglie colpite hanno bisogno di liquidità immediata.

Sentinella affronta questo divario unendo due tecnologie che, prese singolarmente, non risolverebbero il problema. L'intelligenza artificiale si occupa della parte difficile e soggettiva — capire, da segnali climatici e territoriali, quando le condizioni di rischio diventano critiche. La blockchain Solana si occupa della parte che richiede fiducia — custodire i fondi in modo trasparente ed erogarli istantaneamente, senza intermediari e senza che nessuno possa bloccarli o manometterli.

Il risultato è un sistema in cui un agente autonomo osserva il territorio, valuta il rischio con un modello calibrato su eventi storici e, quando una soglia oggettiva e prestabilita viene superata, attiva automaticamente il pagamento di un soccorso predefinito alle comunità registrate. Tutto resta auditabile pubblicamente: le soglie, le decisioni, le motivazioni, i bonifici.

Il progetto si colloca esattamente all'intersezione richiesta dalla track principale (AI × Web3) e soddisfa contemporaneamente le track Solana (agente AI on-chain), Blockchain for Good Alliance (impatto sociale e ambientale, trasparenza, responsabilità) e, grazie al focus sulle frane, la bounty Terna sulla resilienza del territorio.

---

## 2. Il problema

L'Italia è tra i Paesi europei più esposti al rischio idrogeologico, e la Campania — sede stessa dell'hackathon — è una delle regioni più fragili. La memoria della tragedia di Sarno del 1998, quando le colate di fango innescate da piogge eccezionali causarono circa 160 vittime, è il promemoria di quanto rapidamente una soglia di pioggia possa trasformarsi in catastrofe.

Il danno, però, non si esaurisce nell'evento. Dopo una frana o un'alluvione, le famiglie devono affrontare spese immediate — alloggio temporaneo, beni di prima necessità, ripristino — mentre i canali di sostegno restano lenti. L'assicurazione tradizionale richiede una perizia in loco per stabilire l'entità del danno: un processo costoso, soggettivo e facilmente contestabile. Gli aiuti pubblici seguono iter amministrativi che possono durare mesi. La conseguenza è che il sostegno arriva quando l'emergenza acuta è già passata.

Esiste poi un secondo problema, più sistemico: la **trasparenza**. Quando fondi di soccorso passano per molti intermediari, diventa difficile per i donatori e per la collettività verificare che il denaro sia effettivamente arrivato a chi ne aveva diritto. La mancanza di tracciabilità mina la fiducia e l'efficacia degli aiuti.

Sentinella nasce per colmare entrambi i divari: la **velocità** (dall'evento al soccorso in pochi minuti) e la **fiducia** (ogni euro tracciabile e verificabile da chiunque).

---

## 3. La soluzione: il concetto

L'idea centrale è abbandonare la logica dell'indennizzo basato sul danno e adottare un modello **parametrico**.

Un sistema parametrico non valuta *se* e *quanto* danno si è verificato — operazione lenta e soggettiva — ma misura *se un indicatore fisico, oggettivo e concordato in anticipo, ha superato una soglia critica*. Se la condizione si verifica, il pagamento scatta in automatico, senza periti e senza discrezionalità. È esattamente questa scelta a rendere possibile l'automazione e la fiducia.

Sopra questa logica, Sentinella aggiunge tre elementi che la rendono qualcosa di nuovo:

Un **agente autonomo** che non si limita a eseguire una regola fissa, ma monitora continuamente più fonti di dati, le interpreta con un modello di rischio e prende la decisione di erogazione come attore di prima classe sulla blockchain — possedendo un proprio portafoglio e firmando le transazioni.

Un **pool di fondi on-chain in USDC**, prefinanziato, dal quale l'agente preleva ed eroga direttamente ai portafogli delle comunità registrate nel momento del trigger. Nessun intermediario, nessun blocco, accredito in pochi secondi grazie alla velocità e ai costi minimi di Solana.

Una **trasparenza radicale**: le soglie sono scritte on-chain prima di qualunque evento, ogni valutazione di rischio e ogni pagamento sono registrati e consultabili pubblicamente. Chiunque può verificare che il sistema si sia comportato come dichiarato.

In una sola frase: Sentinella è *ciò che viene dopo l'interfaccia* — non un'app che un umano usa per richiedere un aiuto, ma un sistema che osserva il mondo e agisce da solo quando serve.

---

## 4. Perché AI × Web3: la convergenza

Questo progetto è significativo proprio perché nessuna delle due tecnologie, da sola, lo renderebbe possibile.

Una soluzione di sola **intelligenza artificiale** potrebbe rilevare il rischio, ma non potrebbe erogare fondi in modo affidabile e non manipolabile: servirebbe comunque un'istituzione fidata che custodisce il denaro e decide di pagare, reintroducendo lentezza e opacità.

Una soluzione di sola **blockchain** potrebbe custodire ed erogare fondi in modo trasparente, ma resterebbe «cieca»: una semplice regola a soglia unica ("se piove più di X, paga") produce un altissimo *rischio di base*, cioè paga quando non serve oppure non paga quando il danno c'è. Senza intelligenza, il trigger è troppo grezzo per essere giusto.

È l'unione a generare valore: l'AI fornisce il *giudizio* (una stima calibrata e multi-segnale del rischio reale), la blockchain fornisce l'*esecuzione fidata* (custodia trasparente e pagamento istantaneo non bloccabile). L'agente è il punto in cui le due cose si incontrano: un'entità che pensa off-chain e agisce on-chain.

---

## 5. Come si determina il disastro

Questo è il cuore tecnico del progetto e la domanda a cui i giudici daranno più peso: *come si stabilisce, in modo oggettivo e non falsificabile, che si è verificato un evento da soccorrere?*

### 5.1 Principio: trigger parametrico, non perizia del danno

Il sistema non chiede «c'è stato un danno?», ma «un parametro fisico misurabile ha superato la soglia che abbiamo concordato in anticipo?». Questo elimina la soggettività e rende la decisione automatizzabile e verificabile.

### 5.2 Gli indicatori per il rischio di frana

Il focus principale è la **frana**, perché è il rischio più rilevante per la Campania e perché si allinea direttamente alla bounty Terna sul territorio. Gli indicatori usati sono:

La **soglia pioggia intensità-durata** è il segnale principale. La letteratura scientifica definisce curve empiriche che legano l'intensità della pioggia alla sua durata: superata una certa combinazione di quantità cumulata e intensità, la probabilità di innesco di colate superficiali cresce rapidamente.

L'**umidità e saturazione del suolo** modula la soglia: un terreno già saturo da piogge precedenti cede con quantità di pioggia molto inferiori.

La **suscettibilità statica del territorio** è uno strato di base che combina pendenza, litologia e uso del suolo. Un versante ripido su terreni instabili e disboscati è strutturalmente più a rischio.

In versione avanzata si può aggiungere la **deformazione del terreno da InSAR**, ovvero il movimento millimetrico del suolo rilevato da radar satellitare, utile come segnale precursore.

Per alluvioni e siccità la logica è analoga, con indicatori diversi (pioggia cumulata, livelli idrometrici ed estensione dell'allagamento da satellite radar per le alluvioni; deficit pluviometrico, indici come lo SPI e indice di vegetazione NDVI per la siccità), ma per l'MVP ci si concentra sulle frane.

### 5.3 Dove interviene davvero l'AI

Una soglia singola sarebbe parametrica ma «stupida», con elevato rischio di base. Il valore dell'AI sta nel **fondere tutti questi segnali in un'unica probabilità calibrata**, addestrando il modello su eventi storici (ad esempio le date e localizzazioni del catalogo nazionale delle frane). Il modello — un gradient boosting o, per l'MVP, anche una regressione logistica ben calibrata — restituisce per ogni area monitorata una probabilità di evento *e* i fattori che hanno contribuito alla stima, garantendo spiegabilità.

Questa è la differenza tra una regola cieca e un agente intelligente, ed è ciò che rende credibile la riduzione del rischio di base. Vale la pena dichiararlo esplicitamente nel pitch: ammettere che il rischio di base esiste, e mostrare che lo si affronta con la fusione multi-segnale, è un segnale di maturità tecnica che i giudici apprezzano.

---

## 6. Architettura tecnica

Il sistema è una pipeline in cui il dato parte dal mondo fisico e arriva, attraverso una catena verificabile, fino al pagamento on-chain.

**Strato di ingestione dei dati.** L'agente raccoglie le precipitazioni (stazioni regionali ARPA o rianalisi Copernicus ERA5 per i dati storici), una stima dell'umidità del suolo e lo strato statico di suscettibilità derivato dai dati ISPRA. Per ogni comune o cella geografica monitorata si compone così un vettore di feature aggiornato.

**Modello AI di rischio.** Le feature vengono date in input al modello, che produce la probabilità di frana per ciascuna area insieme ai fattori contribuenti. Il modello è addestrato e calibrato su eventi storici per minimizzare falsi positivi e falsi negativi.

**Oracolo (Switchboard On-Demand).** Per portare on-chain in modo affidabile il punteggio di rischio serve un oracolo. Su Solana la scelta è Switchboard, che permette di creare in modo permissionless feed di dati personalizzati — incluse fonti climatiche — e che può eseguire logica personalizzata aggregando più sorgenti. La sicurezza è garantita da attestazione hardware (TEE), e in produzione si usano più oracoli indipendenti così che nessun singolo attore possa fabbricare un trigger. L'oracolo pubblica on-chain il punteggio di rischio o il flag di attivazione per ciascuna area.

**Programma on-chain (Solana, Anchor/Rust).** È il custode dei fondi e l'esecutore delle regole. Comprende un *vault* controllato da programma che custodisce il pool in USDC; un *registro dei beneficiari* per ciascuna area; le *soglie pre-registrate* scritte on-chain e immutabili dopo il commit; e la *logica di erogazione*, che al superamento del flag di rischio per un'area eroga gli importi prestabiliti ai beneficiari di quell'area. Include inoltre i meccanismi anti-abuso descritti più avanti (tetto per evento, periodo di raffreddamento, finestra di contestazione).

**Orchestrazione dell'agente (Solana Agent Kit V2 + LLM).** L'agente è il collante e l'attore di prima classe on-chain: possiede un portafoglio, monitora i dati, interroga il modello, richiede l'aggiornamento dell'oracolo, verifica lo stato on-chain e, quando la condizione si avvera, costruisce ed esegue le transazioni di pagamento, pubblicando la motivazione. Si appoggia al Solana Agent Kit di SendAI, che fornisce le azioni pronte per token, trasferimenti e interazioni con i protocolli e si integra con i principali framework AI. Il portafoglio è embedded (Privy o Turnkey) con possibilità di conferma *human-in-the-loop* per le erogazioni di importo elevato.

**Frontend e registro pubblico.** Una dashboard mostra la mappa delle aree monitorate, i punteggi di rischio in tempo reale, lo storico dei trigger e il registro completo dei pagamenti, il tutto verificabile da chiunque.

Il flusso completo, in sintesi: *l'agente raccoglie i dati di un'area → il modello AI calcola la probabilità di frana → Switchboard pubblica il punteggio on-chain in modo verificabile → il programma rileva il superamento della soglia pre-registrata → l'agente eroga automaticamente l'USDC ai beneficiari → la motivazione e i pagamenti restano auditabili on-chain.*

---

## 7. Stack tecnologico

| Livello | Tecnologia | Ruolo |
|---|---|---|
| Blockchain | Solana (devnet) | Settlement istantaneo, costi minimi, alta velocità |
| Programma on-chain | Anchor (Rust) | Vault USDC, registro beneficiari, logica di trigger e anti-abuso |
| Agente | Solana Agent Kit V2 (SendAI) + LLM | Orchestrazione, attore on-chain con portafoglio proprio |
| Oracolo | Switchboard On-Demand | Pubblicazione verificabile dei dati climatici/di rischio on-chain |
| Asset | USDC (token SPL) | Fondi di soccorso a valore stabile |
| Portafogli | Privy / Turnkey | Portafogli embedded, conferma human-in-the-loop |
| Dati | Copernicus ERA5, ARPA Campania, ISPRA | Pioggia, umidità del suolo, suscettibilità del territorio |
| Modello AI | Gradient boosting / regressione calibrata | Probabilità di frana + spiegabilità |
| Frontend | React / Next.js | Dashboard e registro pubblico dei pagamenti |

---

## 8. Sicurezza, fiducia e anti-abuso

La domanda critica — «cosa impedisce a qualcuno di simulare una catastrofe per svuotare il pool?» — riceve una risposta su più livelli.

Sul piano del dato, si usano **più fonti indipendenti** e **più oracoli**, con attestazione hardware, così che nessun singolo attore possa imporre un valore falso. Sul piano delle regole, le **soglie sono scritte on-chain prima di qualunque evento**: i criteri non si possono spostare a posteriori. Sul piano del trigger, si richiede la **conferma da più segnali** invece di reagire a un singolo sensore rumoroso, e la valutazione è **granulare per area geografica**. Sul piano economico, sono previsti un **tetto di erogazione per evento**, un **periodo di raffreddamento** che impedisce pagamenti ripetuti dallo stesso evento, e una **finestra di contestazione** opzionale prima dell'erogazione definitiva.

Resta da nominare onestamente il limite intrinseco di ogni sistema parametrico: il **rischio di base**, ossia la possibilità che il trigger e il danno reale non coincidano perfettamente. È esattamente il problema che la fusione multi-segnale dell'AI è progettata per minimizzare, e dichiararlo apertamente rafforza la credibilità del progetto.

---

## 9. Esperienza e demo

La dimostrazione racconta una storia concreta e locale. Si seleziona un'area reale della Campania e si «riproduce» un episodio storico di piogge intense, mostrando in diretta l'agente che osserva i dati, vede salire la probabilità di frana, supera la soglia pre-registrata e — nel giro di pochi secondi — eroga l'USDC ai portafogli dimostrativi delle comunità, con tutto registrato sul registro pubblico.

L'effetto narrativo è forte: il passaggio visibile da «condizione critica» ad «accredito immediato» è immediatamente comprensibile, e l'ancoraggio a un evento reale del territorio rende la demo credibile e emotivamente rilevante per una giuria locale.

---

## 10. Impatto (allineamento con Blockchain for Good Alliance)

Sentinella incarna direttamente i valori della BGA. L'**impatto sociale e ambientale** è il cuore del progetto: protezione delle comunità vulnerabili dagli effetti di eventi climatici sempre più frequenti. La **trasparenza e la responsabilità** sono garantite per costruzione, perché ogni soglia, decisione e pagamento è pubblico e verificabile. La logica modulare e l'uso di standard aperti favoriscono **collaborazione e interoperabilità**. Infine, la soluzione è **scalabile e sostenibile**: lo stesso schema parametrico si estende ad altre aree, ad altri rischi (alluvioni, siccità) e ad altri Paesi, con costi di transazione trascurabili.

---

## 11. Roadmap dei 3 giorni

| Giorno | Obiettivi |
|---|---|
| **1** | Setup ambiente e devnet. Acquisizione e pulizia dei dati storici di un'area campione (pioggia, suscettibilità). Modello di rischio di base addestrato. Scheletro del programma Anchor (vault, registro). |
| **2** | Integrazione dell'oracolo Switchboard. Logica di erogazione e soglie on-chain. Agente orchestratore con Solana Agent Kit (monitoraggio → decisione → pagamento). Registro dei beneficiari e meccanismi anti-abuso essenziali. |
| **3** | Dashboard e registro pubblico. Demo end-to-end con replay dell'evento storico in Campania. Rifinitura, landing page (bounty SiteLab) e preparazione del pitch. |

---

## 12. Oltre l'hackathon

Il prototipo è il primo passo di un percorso chiaro. In produzione si passerebbe a una rete di **oracoli pienamente decentralizzati** e a **fonti dati ufficiali** in tempo reale (Protezione Civile, ARPA, dati satellitari Copernicus). Il modello di rischio verrebbe validato con enti scientifici e di protezione civile. Si definirebbero i **partner di prefinanziamento** del pool (enti pubblici, assicuratori, donatori, organizzazioni umanitarie) e si affronterebbero gli aspetti normativi dell'erogazione di fondi e dell'assicurazione parametrica. La componente di monitoraggio del rischio, in particolare, costituisce un naturale punto di incontro con il percorso di incubazione di Terna sulla resilienza del territorio.

---

## 13. Allineamento con le track e le bounty

| Track / Bounty | Come Sentinella la soddisfa |
|---|---|
| **Solana** | Agente AI autonomo come attore on-chain di prima classe: possiede un portafoglio, decide e transa direttamente sui protocolli Solana tramite Solana Agent Kit. |
| **Blockchain for Good Alliance** | Impatto sociale e ambientale, trasparenza e responsabilità per costruzione, soluzione scalabile e sostenibile. |
| **Terna** | Rilevamento del rischio di frana e generazione di output di allerta precoce a partire da dati climatici e territoriali: lo strato di monitoraggio è riutilizzabile per la resilienza della rete. |
| **Mood Global Services** | Caso d'uso AI innovativo: fusione multi-segnale per la stima del rischio applicata a un problema reale. |
| **SiteLab** | Landing page curata per presentare l'idea. |
| **Main Track (bonus)** | Convergenza autentica AI × Web3 che «costruisce ciò che viene dopo l'interfaccia». |

---

## 14. Rischi e limiti

Il **rischio di base** è il limite strutturale dell'approccio parametrico e viene mitigato — non eliminato — dalla fusione multi-segnale. La **fiducia nell'oracolo** è un punto critico, affrontato con molteplicità di fonti, molteplicità di oracoli e attestazione hardware. La **disponibilità e qualità dei dati** in un MVP impone l'uso di dataset storici o semplificati, con un percorso definito verso fonti ufficiali in tempo reale. Gli **aspetti normativi** dell'erogazione di fondi e dell'assicurazione parametrica sono rilevanti e restano fuori dal perimetro del prototipo, da validare nelle fasi successive.

---

*Sentinella — Ship the shift. Build what comes after the interface.*
