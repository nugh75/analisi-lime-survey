# Analisi delle Intestazioni del Dataset

**Progetto:** analisi-lime-survey-orientamento-CPIA  
**Data esportazione:** 24/09/2025 alle 11:48:58  
**File sorgente:** `header_analysis.csv`

## Descrizione

Questo file contiene l'analisi statistica di tutte le colonne del dataset originale.

## Dati

| original_name | normalized_name | dtype | non_null_count | unique_count_non_null | unique_count_including_na | example_values |
| --- | --- | --- | --- | --- | --- | --- |
| ID risposta | idrisposta | int64 | 5 | 5 | 5 | [1, 2, 3] |
| Data invio | datainvio | object | 2 | 1 | 2 | ['1980-01-01 00:00:00', '1980-01-01 00:00:00'] |
| Ultima pagina | ultimapagina | float64 | 4 | 3 | 4 | [26.0, 42.0, 48.0] |
| Lingua iniziale | linguainiziale | object | 5 | 1 | 1 | ['it', 'it', 'it'] |
| Seme | seme | int64 | 5 | 5 | 5 | [1102216992, 1266523766, 1011537043] |
| 1.1 Ruolo: | 11ruolo | object | 4 | 2 | 3 | ['docente', 'docente', 'Altro'] |
| 1.1 Ruolo: [Altro] | 11ruoloaltro | object | 1 | 1 | 2 | ['A022'] |
| 1.2 Età: | 12eta | object | 4 | 1 | 2 | ['più di 60', 'più di 60', 'più di 60'] |
| 1.3 Genere: | 13genere | object | 4 | 2 | 3 | ['femmina', 'femmina', 'femmina'] |
| 1.4 Titolo di studio (indichi tutti i titoli posseduti): [laurea ] | 14titolodistudioindichituttiititolipossedutilaurea | object | 4 | 2 | 3 | ['No', 'Sì', 'No'] |
| 1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di perfezionamento ] | 14titolodistudioindichituttiititoliposseduticorsidiperfezionamento | object | 4 | 2 | 3 | ['Sì', 'No', 'No'] |
| 1.4 Titolo di studio (indichi tutti i titoli posseduti): [corsi di specializzazione ] | 14titolodistudioindichituttiititoliposseduticorsidispecializzazione | object | 4 | 1 | 2 | ['No', 'No', 'No'] |
| 1.4 Titolo di studio (indichi tutti i titoli posseduti): [master ] | 14titolodistudioindichituttiititolipossedutimaster | object | 4 | 2 | 3 | ['No', 'No', 'Sì'] |
| 1.4 Titolo di studio (indichi tutti i titoli posseduti): [dottorato ] | 14titolodistudioindichituttiititolipossedutidottorato | object | 4 | 1 | 2 | ['No', 'No', 'No'] |
| 1.5 Anzianità di servizio non di ruolo nella scuola: | 15anzianitadiservizionondiruolonellascuola | object | 4 | 2 | 3 | ['oltre 15 anni', 'meno di 5 anni', 'meno di 5 anni'] |
| 1.6 Anzianità di servizio di ruolo nella scuola: | 16anzianitadiserviziodiruolonellascuola | object | 4 | 2 | 3 | ['oltre 15 anni', 'oltre 15 anni', 'oltre 15 anni'] |
| 1.7 Attualmente svolge altri incarichi (vicepreside, funzione strumentale etc.)?  | 17attualmentesvolgealtriincarichivicepresidefunzionestrumentaleetc | object | 4 | 2 | 3 | ['No', 'No', 'No'] |
| 1.7.b Specificare: | 17bspecificare | object | 1 | 1 | 2 | ['.'] |
| 1.8 Per quale classe di concorso ha conseguito l’abilitazione all’insegnamento? Se ha conseguito l’abilitazione per più classi di concorso, le indichi separandole con una virgola (es. A012,A013) | 18perqualeclassediconcorsohaconseguitolabilitazioneallinsegnamentosehaconseguitolabilitazioneperpiuclassidiconcorsoleindichiseparandoleconunavirgolaesa012a013 | object | 4 | 3 | 4 | ['A022', 'AO22', 'A022'] |
| 1.9 Insegnamento in qualità di docente per le attività di sostegno  | 19insegnamentoinqualitadidocenteperleattivitadisostegno | object | 4 | 1 | 2 | ['non ho mai insegnato su posto di sostegno', 'non ho mai insegnato su posto di sostegno', 'non ho mai insegnato su posto di sostegno'] |
| 2.1 Nel PTOF della sua scuola è prevista una sezione dedicata all’orientamento? | 21nelptofdellasuascuolaeprevistaunasezionededicataallorientamento | object | 4 | 1 | 2 | ['Sì', 'Sì', 'Sì'] |
| 2.2 Le attività di orientamento prevedono interventi organizzati [all’interno della scuola ] | 22leattivitadiorientamentoprevedonointerventiorganizzatiallinternodellascuola | object | 4 | 1 | 2 | ['Sì', 'Sì', 'Sì'] |
| 2.2 Le attività di orientamento prevedono interventi organizzati [sul territorio in collaborazione con le università] | 22leattivitadiorientamentoprevedonointerventiorganizzatisulterritorioincollaborazioneconleuniversita | object | 4 | 1 | 2 | ['No', 'No', 'No'] |
| 2.2 Le attività di orientamento prevedono interventi organizzati [sul territorio in collaborazione con le aziende locali] | 22leattivitadiorientamentoprevedonointerventiorganizzatisulterritorioincollaborazioneconleaziendelocali | object | 4 | 1 | 2 | ['No', 'No', 'No'] |
| 2.2 Le attività di orientamento prevedono interventi organizzati [sul territorio in collaborazione con enti pubblici territoriali (regioni, comuni, province, città metropolitane, comunità montane etc.)] | 22leattivitadiorientamentoprevedonointerventiorganizzatisulterritorioincollaborazioneconentipubbliciterritorialiregionicomuniprovincecittametropolitanecomunitamontaneetc | object | 4 | 2 | 3 | ['No', 'Sì', 'No'] |
| 2.2 Le attività di orientamento prevedono interventi organizzati [sul territorio in collaborazione con enti del terzo settore (cooperative, associazioni no profit etc.)] | 22leattivitadiorientamentoprevedonointerventiorganizzatisulterritorioincollaborazioneconentidelterzosettorecooperativeassociazioninoprofitetc | object | 4 | 2 | 3 | ['Sì', 'Sì', 'No'] |
| 2.3 Le attività di orientamento indicate nel PTOF sono finalizzate a [valorizzare le attitudini e le inclinazioni dello studente] | 23leattivitadiorientamentoindicatenelptofsonofinalizzateavalorizzareleattitudinieleinclinazionidellostudente | object | 4 | 3 | 4 | ['Per nulla', 'Poco', 'Poco'] |
| 2.3 Le attività di orientamento indicate nel PTOF sono finalizzate a [valorizzare gli interessi e le preferenze dello studente] | 23leattivitadiorientamentoindicatenelptofsonofinalizzateavalorizzaregliinteressielepreferenzedellostudente | object | 4 | 3 | 4 | ['Per nulla', 'Poco', 'Poco'] |
| 2.3 Le attività di orientamento indicate nel PTOF sono finalizzate a [accompagnare lo studente nell’elaborazione critica del proprio progetto di vita] | 23leattivitadiorientamentoindicatenelptofsonofinalizzateaaccompagnarelostudentenellelaborazionecriticadelproprioprogettodivita | object | 4 | 3 | 4 | ['Per nulla', 'Poco', 'Poco'] |
| 2.3 Le attività di orientamento indicate nel PTOF sono finalizzate a [accompagnare lo studente nelle transizioni formative e professionali] | 23leattivitadiorientamentoindicatenelptofsonofinalizzateaaccompagnarelostudentenelletransizioniformativeeprofessionali | object | 4 | 2 | 3 | ['Poco', 'Poco', 'Abbastanza'] |
| 2.4 Le attività di orientamento indicate nel PTOF prevedono interventi mirati al raggiungimento dei seguenti obiettivi: [ridurre l’abbandono scolastico ] | 24leattivitadiorientamentoindicatenelptofprevedonointerventimiratialraggiungimentodeiseguentiobiettiviridurrelabbandonoscolastico | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.4 Le attività di orientamento indicate nel PTOF prevedono interventi mirati al raggiungimento dei seguenti obiettivi: [favorire la continuità formativa tra scuola e realtà socioeconomica del territorio] | 24leattivitadiorientamentoindicatenelptofprevedonointerventimiratialraggiungimentodeiseguentiobiettivifavorirelacontinuitaformativatrascuolaerealtasocioeconomicadelterritorio | object | 4 | 2 | 3 | ['Poco', 'Poco', 'Poco'] |
| 2.4 Le attività di orientamento indicate nel PTOF prevedono interventi mirati al raggiungimento dei seguenti obiettivi: [contrastare il fenomeno dei NEET (ragazzi che non studiano, non lavorano, non seguono corsi di formazione)] | 24leattivitadiorientamentoindicatenelptofprevedonointerventimiratialraggiungimentodeiseguentiobiettivicontrastareilfenomenodeineetragazzichenonstudianononlavoranononseguonocorsidiformazione | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.4 Le attività di orientamento indicate nel PTOF prevedono interventi mirati al raggiungimento dei seguenti obiettivi: [favorire l’educazione all’apprendimento e alla formazione permanente ] | 24leattivitadiorientamentoindicatenelptofprevedonointerventimiratialraggiungimentodeiseguentiobiettivifavorireleducazioneallapprendimentoeallaformazionepermanente | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.5 Le azioni di orientamento indicate nel PTOF prevedono l’adozione di iniziative volte a promuovere [attività che partano dall’esperienza degli studenti] | 25leazionidiorientamentoindicatenelptofprevedonoladozionediiniziativevolteapromuovereattivitachepartanodallesperienzadeglistudenti | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.5 Le azioni di orientamento indicate nel PTOF prevedono l’adozione di iniziative volte a promuovere [didattica laboratoriale] | 25leazionidiorientamentoindicatenelptofprevedonoladozionediiniziativevolteapromuoveredidatticalaboratoriale | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.5 Le azioni di orientamento indicate nel PTOF prevedono l’adozione di iniziative volte a promuovere [flessibilità degli spazi e dei tempi] | 25leazionidiorientamentoindicatenelptofprevedonoladozionediiniziativevolteapromuovereflessibilitadeglispaziedeitempi | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.5 Le azioni di orientamento indicate nel PTOF prevedono l’adozione di iniziative volte a promuovere [attività di “Accoglienza e Orientamento”] | 25leazionidiorientamentoindicatenelptofprevedonoladozionediiniziativevolteapromuovereattivitadiaccoglienzaeorientamento | object | 4 | 2 | 3 | ['Poco', 'Abbastanza', 'Abbastanza'] |
| 2.6 Nel PTOF, la prospettiva orientativa è inserita nella didattica attraverso  [attività che partano dall’esperienza degli studenti] | 26nelptoflaprospettivaorientativaeinseritanelladidatticaattraversoattivitachepartanodallesperienzadeglistudenti | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.6 Nel PTOF, la prospettiva orientativa è inserita nella didattica attraverso  [didattica laboratoriale] | 26nelptoflaprospettivaorientativaeinseritanelladidatticaattraversodidatticalaboratoriale | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.6 Nel PTOF, la prospettiva orientativa è inserita nella didattica attraverso  [flessibilità degli spazi e dei tempi] | 26nelptoflaprospettivaorientativaeinseritanelladidatticaattraversoflessibilitadeglispaziedeitempi | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.7 Il PTOF garantisce agli studenti l’opportunità di fruire di attività opzionali e facoltative intra ed extra scolastiche  [culturali (teatro, musei, cinema, biblioteche etc.)] | 27ilptofgarantisceaglistudentilopportunitadifruirediattivitaopzionaliefacoltativeintraedextrascolasticheculturaliteatromuseicinemabibliotecheetc | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.7 Il PTOF garantisce agli studenti l’opportunità di fruire di attività opzionali e facoltative intra ed extra scolastiche  [laboratoriali, espressive e creative (attività teatrali, musicali, artistiche etc.) ] | 27ilptofgarantisceaglistudentilopportunitadifruirediattivitaopzionaliefacoltativeintraedextrascolastichelaboratorialiespressiveecreativeattivitateatralimusicaliartisticheetc | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.7 Il PTOF garantisce agli studenti l’opportunità di fruire di attività opzionali e facoltative intra ed extra scolastiche  [ludiche e ricreative (coinvolgimento in giochi di varia tipologia indoor-outdoor)] | 27ilptofgarantisceaglistudentilopportunitadifruirediattivitaopzionaliefacoltativeintraedextrascolasticheludicheericreativecoinvolgimentoingiochidivariatipologiaindooroutdoor | object | 4 | 1 | 2 | ['Abbastanza', 'Abbastanza', 'Abbastanza'] |
| 2.7 Il PTOF garantisce agli studenti l’opportunità di fruire di attività opzionali e facoltative intra ed extra scolastiche  [di volontariato] | 27ilptofgarantisceaglistudentilopportunitadifruirediattivitaopzionaliefacoltativeintraedextrascolastichedivolontariato | object | 4 | 2 | 3 | ['Abbastanza', 'Poco', 'Poco'] |
| 2.7 Il PTOF garantisce agli studenti l’opportunità di fruire di attività opzionali e facoltative intra ed extra scolastiche  [sportive] | 27ilptofgarantisceaglistudentilopportunitadifruirediattivitaopzionaliefacoltativeintraedextrascolastichesportive | object | 4 | 2 | 3 | ['Per nulla', 'Per nulla', 'Per nulla'] |
| 2.8 Il PTOF prevede una rete di coordinamento fra istituzioni scolastiche e formative per facilitare eventuali passaggi orizzontali tra i percorsi presenti sul territorio?  | 28ilptofprevedeunaretedicoordinamentofraistituzioniscolasticheeformativeperfacilitareeventualipassaggiorizzontalitraipercorsipresentisulterritorio | object | 4 | 1 | 2 | ['Siamo già in rete ed attivi per accompagnamenti e passaggi', 'Siamo già in rete ed attivi per accompagnamenti e passaggi', 'Siamo già in rete ed attivi per accompagnamenti e passaggi'] |
| 3.1 Per prepararsi a svolgere il suo ruolo di docente tutor o di docente orientatore per l’orientamento ha seguito corsi specifici? | 31perprepararsiasvolgereilsuoruolodidocentetutorodidocenteorientatoreperlorientamentohaseguitocorsispecifici | object | 4 | 2 | 3 | ['Sì', 'No', 'No'] |
| 3.2 Indichi i corsi (per un massimo di tre) [ente organizzatore del corso (indicare denominazione università/ente/centro di formazione etc.)] | 32indichiicorsiperunmassimoditreenteorganizzatoredelcorsoindicaredenominazioneuniversitaentecentrodiformazioneetc | float64 | 0 | 0 | 1 | nan |
| 3.2 Indichi i corsi (per un massimo di tre) [titolo del corso] | 32indichiicorsiperunmassimoditretitolodelcorso | float64 | 0 | 0 | 1 | nan |

*Nota: Mostrate solo le prime 50 righe di 260 totali.*

---
*Generato automaticamente dal pipeline di analisi del questionario LIME Survey*
