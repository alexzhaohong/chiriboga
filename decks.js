//GUIDE FOR CARD DEFINITIONS

//REQUIRED properties:
/*
.title
.player
.cardType //entirely lowercase e.g. agenda
*/

//IMPLEMENTATION properties
/*
.cardLocation
.installOnlyOn //a function(card) that returns true for cards that can host this
.canHost //a function(card) that returns true for cards that can be hosted on this
.recurringCredits //automatically replenished when installed and at start of your turn
.canUseCredits //function(doing,card) which returns true if .credits can be spent (doing is "using","installing","removing tags","trace","rezzing","playing","advancing","trashing")
.activeForOpponent //has an ability the opponent can use
*/

//COMMON properties:
/*
.requireHumanInput //set true if you want acknowledgement even when there's only one option
.imageFile //if using a GUI i.e. CardRenderer
.advancementRequirement
.canBeAdvanced //will be set true for all agendas if not defined
.agendaPoints
.installCost
.memoryCost
.memoryUnits //makes more available for runner (not to be confused with memoryCost or hostingMU)
.playCost
.rezCost
.strength
.subTypes[] //formatted as printed on card including capital letters and spaces
.trashCost
.unique //if true, any other cards with the same .title will be trashed when this is installed
.link //included in runner's link strength
*/

//DON'T FORGET any custom properties you want to reset (e.g. on trash or return to hand) should be placed in cardPropertyResets
//TODO maybe replace these with generic names

//TRIGGERED callbacks:
//Note that conveniently the globalTriggers phase will call Enumerate and Resolve in the context of the card (rather than context of triggerCallback)
//Each has (unless specified otherwise):
// .Resolve(params) //parameter object will contain all the necessary properties
//And optionally also:
// .Enumerate() //returns array where each element is a legal set of parameters for .Resolve(params), assumed valid if Enumerate omitted
// .text
// .automatic //set true to have this fire before the others i.e. not on the resolution order list (usually used for things that are not actual effects on card, just implementation)
// .availableWhenInactive //set true to have this fire even when not active
//Player chooses resolution order when multiple trigger simultaneously (e.g. multiple cards have 'when turn begins')
/*
 .abilities[] //for operations and events the .Enumerate, .Resolve and .text are properties of the card itself not in abilities array
 .subroutines[] //unlike the others here, these do not use Enumerate or params (for decisionmaking, implement a pseudophase) and have .visual with y (centre) and h (height)
 .corpTurnBegin
 .runnerTurnBegin
 .runBegins //called with input (server) (currently treats all as automatic)
 .encounterEnds //note encountering will now be false but approachIce available to use
 .approachServer //called when approaching the server (before runner decides whether to continue the run)
 .runSuccessful //called before breaching the server
 .breachServer //called before accessing cards, return an int modifier e.g. -1, 0, 1 to access more or less cards (currently treats all as automatic)
 .runUnsuccessful
 .runEnds (note this is the phase after runSuccessful/runUnsuccessful i.e. not equivalent to triggering in both)
 .corpDiscardEnds
 .runnerDiscardEnds
 .stolen //called after a card is stolen (intended.steal will still be available to use)
 .scored //called after a card is scored (intended.score will still be available to use)
 .addTags //called when tags are to be added
 .tagsTaken //called after tags are taken (or given), intended.addTags has the number
 .netDamage //called when net damage is to be given/taken
 .meatDamage //called when meat damage is to be given/taken
 .trash //called when a card is to be trashed
 .expose //called when a card is to be exposed
 .steal //called when a card is to be stolen
 .score //called when a card is to be scored
 .anyChange //called after any change but before render, essentially adds this to the main loop (currently treats all as automatic)
 .modifyMaxHandSize //called with input (player) when getting maximum hand size, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyStrength //called with input (card) when getting strength, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyRezCost //called with input (card) when getting rez cost, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyInstallCost //called with input (card) when getting install cost, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyAdvancementRequirement //called with input (card) when getting advancement requirement, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyBasicActionRunnerDraw //called with input (num) when runner about to draw as a basic action, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyBasicActionCorpDraw //called with input (num) when corp about to draw as a basic action, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .modifyAgendaPointsToWin //called with no inputs when checking agenda points to win, return an int modifier e.g. -1, 0, 1 (currently treats all as automatic)
 .cardInstalled //called with input (card) after a card is installed (currently treats all as automatic)
 .cardRezzed //called with input (card) after a card is rezzed (currently treats all as automatic)
 .cardAccessed //called with input (card) when a card is accessed (currently treats all as automatic) even if card not active (special case in CheckCallback)
 .cardEncountered //called with input (card) when a card is encountered (currently treats all as automatic)
 .cardTrashed //called with input (card) when a card is trashed (currently treats all as automatic)
 .cardAdvanced //called with input (card) when a card is advanced (currently treats all as automatic)
 .cannot //called with input (string, card) where the string is a phase option (e.g. "score"), if true is returned, Check<String> will return false (all automatic)
*/

/**
 * Create a card instance from definition.<br/>New card.location is not set.<br/>Nothing is logged.
 *
 * @method InstanceCard
 * @param {Card[]} cardSet the set containing the original definition to create instances from
 * @param {int} setNumber index of the original definition to create instances from
 * @returns {Card} newly created instance
 */
function InstanceCard(
  cardSet,
  setNumber,
  backTextures,
  glowTextures,
  strengthTextures = { ice: null, ib: null, broken: null, rc: null, crc: null }
) {
  var cardDefinition = cardSet[setNumber];
  var player = cardDefinition.player;
  cardDefinition.player = null; //unset to prevent recursion going nuts
  var card = jQuery.extend(true, {}, cardDefinition);
  cardDefinition.player = player; //restore now that recursion is done
  card.player = player;
  card.setNumber = setNumber;
  //Do some special initialisations
  if (card.cardType == "agenda" && typeof card.canBeAdvanced === "undefined")
    card.canBeAdvanced = true; //agendas can be advanced by default
  var costTexture = null;
  if (card.player == runner) costTexture = strengthTextures.rc;
  else if (
    card.cardType == "ice" ||
    card.cardType == "asset" ||
    card.cardType == "upgrade"
  )
    costTexture = strengthTextures.crc;
  var strengthInfo = { texture: null, num: 0, ice: false, cost: costTexture };
  if (typeof (card.strength !== "undefined")) {
    if (card.cardType == "ice")
      strengthInfo = {
        texture: strengthTextures.ice,
        num: card.strength,
        ice: true,
        brokenTexture: strengthTextures.broken,
        cost: costTexture,
      };
    if (card.cardType == "program")
      strengthInfo = {
        texture: strengthTextures.ib,
        num: card.strength,
        ice: false,
        cost: costTexture,
      };
  }

  //Create renderer object if relevant
  if (
    typeof card.imageFile !== "undefined" &&
    typeof backTextures !== "undefined" &&
    typeof glowTextures !== "undefined"
  ) {
    if (typeof cardDefinition.frontTexture === "undefined")
      cardDefinition.frontTexture = cardRenderer.LoadTexture(
        "images/" + card.imageFile
      );
    card.renderer = cardRenderer.CreateCard(
      card,
      cardDefinition.frontTexture,
      backTextures,
      glowTextures,
      strengthInfo
    );

    //create all the counters
    for (var i = 0; i < counterList.length; i++) {
      if (typeof card[counterList[i]] !== "undefined") card[counterList[i]] = 0;
      var counter = cardRenderer.CreateCounter(
        countersUI[counterList[i]].texture,
        card,
        counterList[i],
        1,
        true
      );
      counter.SetPosition(card.renderer.sprite.x, card.renderer.sprite.y);
      card.renderer.sprite.addChild(counter.sprite);
      card.renderer.sprite.addChild(counter.richText);
    }
  }
  return card;
}
/**
 * Create card instances from definition and push into an array. Returns an array of cards pushed.<br/>Nothing is logged.
 *
 * @method InstanceCardsPush
 * @param {Card[]} cardSet the set containing the original definition to create instances from
 * @param {int} setNumber index of the original definition to create instances from
 * @param {Card[]} destination array to push the Card instances into
 * @param {int} num number of copies of the card to add
 * @returns {Card[]} newly created instances
 */
function InstanceCardsPush(
  cardSet,
  setNumber,
  destination,
  num,
  backTextures,
  glowTextures,
  strengthTextures = { ice: null, ib: null }
) {
  var ret = [];
  //push a deep copy num times
  for (var i = 0; i < num; i++) {
    var card = InstanceCard(
      cardSet,
      setNumber,
      backTextures,
      glowTextures,
      strengthTextures
    );
    destination.push(card);
    card.cardLocation = destination;
    ret.push(card);
  }
  return ret;
}

/**
 * Print the given array to the console in a human-readable format.<br/>Nothing is logged.
 *
 * @method PrintDeck
 * @param {Card} identity for deck
 * @param {Card[]} deck array to print
 */
function PrintDeck(identity, deck) {
  //group cards
  var sortedDeck = [];
  for (var i = 0; i < deck.length; i++) {
    var entryFound = -1;
    for (var j = 0; j < sortedDeck.length; j++) {
      if (sortedDeck[j].title == deck[i].title) {
        entryFound = j;
        break;
      }
    }
    if (entryFound > -1) sortedDeck[entryFound].count++;
    else sortedDeck.push({ title: deck[i].title, count: 1 });
  }
  //print
  var ret = [identity.title];
  for (var i = 0; i < sortedDeck.length; i++) {
    ret.push(sortedDeck[i].count + " " + sortedDeck[i].title);
  }
  console.log(ret);
}

/**
 * Set up Corp as a test field. Cards given as set indices in SystemGateway<br/>Nothing is logged.
 *
 * @method CorpTestField
 * @param {int[]} archivesCards cards in archives
 * @param {int[]} rndCards cards in R&D (leave empty to use default/loaded R&D)
 * @param {int[]} hqCards cards in HQ (leave empty to shuffle and draw five cards into HQ)
 * @param {int[]} archivesInstalled cards installed in front of archives or in its root
 * @param {int[]} rndInstalled cards installed in front of R&D or in its root
 * @param {int[]} hqInstalled cards installed in front of HQ or in its root
 * @param {int[][]} remotes remote servers, as cards installed in front or in root
 * @param {int[]} scored cards in Corp's score area
 */
function CorpTestField(
  archivesCards,
  rndCards,
  hqCards,
  archivesInstalled,
  rndInstalled,
  hqInstalled,
  remotes,
  scored,
  cardBackTexturesCorp,
  glowTextures,
  strengthTextures
) {
  for (var i = 0; i < archivesCards.length; i++) {
    InstanceCardsPush(
      systemGateway,
      archivesCards[i],
      corp.archives.cards,
      1,
      cardBackTexturesCorp,
      glowTextures,
      strengthTextures
    );
  }
  if (rndCards.length > 0) {
    while (corp.RnD.cards.length > 0) {
      RemoveFromGame(corp.RnD.cards[0]);
    }
    for (var i = 0; i < rndCards.length; i++) {
      InstanceCardsPush(
        systemGateway,
        rndCards[i],
        corp.RnD.cards,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    }
  }
  if (hqCards.length > 0) {
    for (var i = 0; i < hqCards.length; i++) {
      InstanceCardsPush(
        systemGateway,
        hqCards[i],
        corp.HQ.cards,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    }
    skipShuffleAndDraw = true;
    ChangePhase(phases.corpStartDraw);
  }
  for (var i = 0; i < archivesInstalled.length; i++) {
    if (systemGateway[archivesInstalled[i]].cardType == "ice")
      InstanceCardsPush(
        systemGateway,
        archivesInstalled[i],
        corp.archives.ice,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    else
      InstanceCardsPush(
        systemGateway,
        archivesInstalled[i],
        corp.archives.root,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
  }
  for (var i = 0; i < rndInstalled.length; i++) {
    if (systemGateway[rndInstalled[i]].cardType == "ice")
      InstanceCardsPush(
        systemGateway,
        rndInstalled[i],
        corp.RnD.ice,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    else
      InstanceCardsPush(
        systemGateway,
        rndInstalled[i],
        corp.RnD.root,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
  }
  for (var i = 0; i < hqInstalled.length; i++) {
    if (systemGateway[hqInstalled[i]].cardType == "ice")
      InstanceCardsPush(
        systemGateway,
        hqInstalled[i],
        corp.HQ.ice,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    else
      InstanceCardsPush(
        systemGateway,
        hqInstalled[i],
        corp.HQ.root,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
  }
  for (var j = 0; j < remotes.length; j++) {
    var newServer = NewServer("Remote " + j, false);
    corp.remoteServers.push(newServer);
    for (var i = 0; i < remotes[j].length; i++) {
      if (systemGateway[remotes[j][i]].cardType == "ice")
        InstanceCardsPush(
          systemGateway,
          remotes[j][i],
          newServer.ice,
          1,
          cardBackTexturesCorp,
          glowTextures,
          strengthTextures
        );
      else
        InstanceCardsPush(
          systemGateway,
          remotes[j][i],
          newServer.root,
          1,
          cardBackTexturesCorp,
          glowTextures,
          strengthTextures
        );
    }
  }
  for (var i = 0; i < scored.length; i++) {
    var newCard = InstanceCardsPush(
      systemGateway,
      scored[i],
      corp.scoreArea,
      1,
      cardBackTexturesCorp,
      glowTextures,
      strengthTextures
    )[0];
    newCard.faceUp = true;
  }
}

/**
 * Set up Runner as a test field. Cards given as set indices in SystemGateway<br/>Nothing is logged.
 *
 * @method RunnerTestField
 * @param {int[]} heapCards cards in heap
 * @param {int[]} stackCards cards in stack (leave empty to use default/loaded stack)
 * @param {int[]} gripCards cards in grip (leave empty to shuffle and draw five cards into grip)
 * @param {int[]} installed cards installed
 * @param {int[]} stolen cards in Runner's score area
 */
function RunnerTestField(
  heapCards,
  stackCards,
  gripCards,
  installed,
  stolen,
  cardBackTexturesRunner,
  glowTextures,
  strengthTextures
) {
  for (var i = 0; i < heapCards.length; i++) {
    InstanceCardsPush(
      systemGateway,
      heapCards[i],
      runner.heap,
      1,
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    );
  }
  if (stackCards.length > 0) {
    while (runner.stack.length > 0) {
      RemoveFromGame(runner.stack[0]);
    }
    for (var i = 0; i < stackCards.length; i++) {
      InstanceCardsPush(
        systemGateway,
        stackCards[i],
        runner.stack,
        1,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      );
    }
  }
  if (gripCards.length > 0) {
    for (var i = 0; i < gripCards.length; i++) {
      InstanceCardsPush(
        systemGateway,
        gripCards[i],
        runner.grip,
        1,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      );
    }
    skipShuffleAndDraw = true;
    ChangePhase(phases.runnerStartResponse);
  }
  for (var i = 0; i < installed.length; i++) {
    var dest = runner.rig.resources;
    if (systemGateway[installed[i]].cardType == "program")
      dest = runner.rig.programs;
    else if (systemGateway[installed[i]].cardType == "hardware")
      dest = runner.rig.hardware;
    var newCard = InstanceCardsPush(
      systemGateway,
      installed[i],
      dest,
      1,
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    )[0];
    newCard.faceUp = true;
  }
  for (var i = 0; i < stolen.length; i++) {
    var newCard = InstanceCardsPush(
      systemGateway,
      stolen[i],
      runner.scoreArea,
      1,
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    )[0];
    newCard.faceUp = true;
  }
}

//DECKS
function LoadDecks() {
  //Special variables to store card back textures and strength and install cost textures
  var knownTexture = cardRenderer.LoadTexture("images/known.png");
  var cardBackTexturesCorp = {
    back: cardRenderer.LoadTexture("images/Corp_back.png"),
    known: knownTexture,
  };
  var cardBackTexturesRunner = {
    back: cardRenderer.LoadTexture("images/Runner_back.png"),
    known: knownTexture,
  };
  var strengthTextureIce = cardRenderer.LoadTexture("images/ice_strength.png");
  var strengthTextureIcebreaker = cardRenderer.LoadTexture(
    "images/ib_strength.png"
  );
  var subroutineBrokenTexture = cardRenderer.LoadTexture("images/broken.png");
  var runnerCostTexture = cardRenderer.LoadTexture("images/runner_cost.png");
  var corpRezCostTexture = cardRenderer.LoadTexture("images/corp_rez_cost.png");
  var strengthTextures = {
    ice: strengthTextureIce,
    ib: strengthTextureIcebreaker,
    broken: subroutineBrokenTexture,
    rc: runnerCostTexture,
    crc: corpRezCostTexture,
  };

  //And glow texture
  var glowTextures = {
    zoomed: cardRenderer.LoadTexture("images/glow_white.png"),
    unzoomed: cardRenderer.LoadTexture("images/glow_white_cropped.png"),
    ice: cardRenderer.LoadTexture("images/glow_white_ice.png"),
  };

  var deckJson = {};

  //*RUNNER*
  //LOAD Runner deck, if specified (as an LZ compressed JSON object containing .identity= and .systemGateway=[], with cards specified by number in the set)
  var specifiedRunnerDeck = URIParameter("r");
  if (specifiedRunnerDeck != "") {
    deckJson = JSON.parse(
      LZString.decompressFromEncodedURIComponent(specifiedRunnerDeck)
    );
    runner.identityCard = InstanceCard(
      systemGateway,
      deckJson.identity,
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    ); //note that card.location is not set for identity cards
    for (var i = 0; i < deckJson.systemGateway.length; i++) {
      InstanceCardsPush(
        systemGateway,
        deckJson.systemGateway[i],
        runner.stack,
        1,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      );
    }
  }
  //RUNNER RANDOM System Gateway Deck
  if (runner.stack.length == 0) {
    var runnerIdentities = [1, 10, 19];
    deckJson.identity =
      runnerIdentities[RandomRange(0, runnerIdentities.length - 1)];
    runner.identityCard = InstanceCard(
      systemGateway,
      deckJson.identity,
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    ); //note that card.location is not set for identity cards
    var runnerCards = [
      2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
    ];
    deckJson.systemGateway = [];
    //consoles
    var consoleCards = [3, 23, 14];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        consoleCards,
        runner.stack,
        1,
        0,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
    //fracters
    var fracterCards = [6, 16];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        fracterCards,
        runner.stack,
        runner.stack.length + RandomRange(1, 2),
        3,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
    //decoders
    var decoderCards = [5, 26];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        decoderCards,
        runner.stack,
        runner.stack.length + RandomRange(1, 2),
        3,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
    //killer
    var killerCards = [15, 25];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        killerCards,
        runner.stack,
        runner.stack.length + RandomRange(1, 2),
        3,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
    //economy
    var economyCards = [7, 18, 20, 27, 29, 30, 33]; //only includes cards that would fairly certainly provide credits
    var influenceUsed = CountInfluence(
      runner.identityCard,
      systemGateway,
      deckJson.systemGateway
    );
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        economyCards,
        runner.stack,
        runner.stack.length + RandomRange(9, 11),
        9 - influenceUsed,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
    //any other cards
    influenceUsed = CountInfluence(
      runner.identityCard,
      systemGateway,
      deckJson.systemGateway
    );
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        runner.identityCard,
        systemGateway,
        runnerCards,
        runner.stack,
        40,
        15 - influenceUsed,
        cardBackTexturesRunner,
        glowTextures,
        strengthTextures
      )
    );
  }
  //whichever way the deck is built, update the "Edit this deck" link if the player is viewing as the runner
  if (viewingPlayer == runner) {
    var compressedDeckString = LZString.compressToEncodedURIComponent(
      JSON.stringify(deckJson)
    );
    $("#editdeck").attr(
      "onclick",
      "window.location.href='decklauncher.html?r=" + compressedDeckString + "';"
    );
  }
  PrintDeck(runner.identityCard, runner.stack);

  //run the intro tutorial, if specified
  var specifiedMentor = URIParameter("mentor");
  if (specifiedMentor != "") { //later, more options?
    runner.identityCard = InstanceCard(
      tutorial,
      0, //later, more options?
      cardBackTexturesRunner,
      glowTextures,
      strengthTextures
    ); //note that card.location is not set for identity cards
  }
  
  //InstanceCardsPush(cheat,1,runner.grip,1,cardBackTexturesRunner,glowTextures,strengthTextures);
  //var newCard = InstanceCardsPush(systemGateway,33,runner.rig.resources,1,cardBackTexturesRunner,glowTextures,strengthTextures)[0];
  //newCard.faceUp = true;

  //*CORP*
  //LOAD Corp deck, if specified (as an LZ compressed JSON object containing .identity= and .systemGateway=[], wth cards specified by number in the set)
  deckJson = {};
  var specifiedCorpDeck = URIParameter("c");
  if (specifiedCorpDeck != "") {
    deckJson = JSON.parse(
      LZString.decompressFromEncodedURIComponent(specifiedCorpDeck)
    );
    corp.identityCard = InstanceCard(
      systemGateway,
      deckJson.identity,
      cardBackTexturesCorp,
      glowTextures,
      strengthTextures
    ); //note that card.location is not set for identity cards
    for (var i = 0; i < deckJson.systemGateway.length; i++) {
      InstanceCardsPush(
        systemGateway,
        deckJson.systemGateway[i],
        corp.RnD.cards,
        1,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      );
    }
  }
  //CORP RANDOM System Gateway Deck
  if (corp.RnD.cards.length == 0) {
    var corpIdentities = [35, 43, 51, 59];
    deckJson.identity =
      corpIdentities[RandomRange(0, corpIdentities.length - 1)];
    corp.identityCard = InstanceCard(
      systemGateway,
      deckJson.identity,
      cardBackTexturesCorp,
      glowTextures,
      strengthTextures
    ); //note that card.location is not set for identity cards
    deckJson.systemGateway = [];
    var agendaCards = [60, 44, 36, 67, 68, 69, 70, 52];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomAgendas(
        corp.identityCard,
        systemGateway,
        agendaCards,
        corp.RnD.cards,
        44,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      )
    );
    var economyCards = [37, 48, 56, 64, 71, 75]; //(credit economy only)
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        corp.identityCard,
        systemGateway,
        economyCards,
        corp.RnD.cards,
        corp.RnD.cards.length + RandomRange(9, 11),
        3,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      )
    );
    var influenceUsed = CountInfluence(
      corp.identityCard,
      systemGateway,
      deckJson.systemGateway
    );
    var iceCards = [38, 62, 39, 46, 54, 47, 72, 63, 55, 73, 74];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        corp.identityCard,
        systemGateway,
        iceCards,
        corp.RnD.cards,
        corp.RnD.cards.length + RandomRange(15, 18),
        9 - influenceUsed,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      )
    );
    influenceUsed = CountInfluence(
      corp.identityCard,
      systemGateway,
      deckJson.systemGateway
    );
    var otherCards = [40, 41, 42, 45, 49, 50, 53, 57, 58, 61, 65, 66];
    deckJson.systemGateway = deckJson.systemGateway.concat(
      DeckBuildRandomly(
        corp.identityCard,
        systemGateway,
        otherCards,
        corp.RnD.cards,
        44,
        15 - influenceUsed,
        cardBackTexturesCorp,
        glowTextures,
        strengthTextures
      )
    );
  }
  //whichever way the deck is built, update the "Edit this deck" link if the player is viewing as the corp
  if (viewingPlayer == corp) {
    var compressedDeckString = LZString.compressToEncodedURIComponent(
      JSON.stringify(deckJson)
    );
    $("#editdeck").attr(
      "onclick",
      "window.location.href='decklauncher.html?c=" + compressedDeckString + "';"
    );
  }
  PrintDeck(corp.identityCard, corp.RnD.cards);

  /*
	var leech = InstanceCardsPush(systemGateway,8,runner.rig.programs,1,cardBackTexturesRunner,glowTextures,strengthTextures)[0];
	leech.faceUp = true;
	AddCounters(leech,"virus",3);
	*/
   /*
	RunnerTestField([2,3,4], //heapCards
		[26,26,26], //stackCards
		[26,26,26,26,26], //gripCards
		[26,16,18], //installed
		[], //stolen
		cardBackTexturesRunner,glowTextures,strengthTextures);
	*/
	/*
	CorpTestField([], //archivesCards
		[40,40,40,40], //rndCards
		[40,40,40,40], //hqCards
		[], //archivesInstalled
		[74,54,42], //rndInstalled
		[74,54], //hqInstalled
		[[74],[54]], //remotes (array of arrays)
		[], //scored
		cardBackTexturesCorp,glowTextures,strengthTextures);
  */
  //AddCounters(runner.rig.programs[0],"virus");
  //AddCounters(runner.rig.programs[1],"virus");
  //AddCounters(runner.rig.resources[0],"credits",5);

  //Rez(corp.remoteServers[0].ice[0]);
  //Rez(corp.remoteServers[1].ice[0]);
  //Trash(corp.remoteServers[0].ice[0]);
  //Rez(corp.remoteServers[0].ice[0]);
  //Trash(corp.remoteServers[0].ice[0]);

  //corp.archives.cards[0].rezzed = true;
  //corp.archives.cards[1].rezzed = true;
  
  //runner.heap[0].faceUp = true;
  //runner.heap[1].faceUp = true;

  //Rez(corp.archives.ice[0]);
  
  //Rez(corp.HQ.ice[0]);
  //Rez(corp.RnD.ice[0]);
  //Rez(corp.HQ.ice[1]);
  //Rez(corp.RnD.ice[1]);
  //Rez(corp.remoteServers[0].ice[0]);
  //Rez(corp.remoteServers[0].ice[1]);
  
  //Rez(corp.RnD.ice[2]);
  //Rez(corp.remoteServers[0].root[0]);
  //Rez(corp.remoteServers[1].root[0]);
  
  //Advance(corp.HQ.ice[0]);
  //Advance(corp.RnD.ice[0]);
  //Advance(corp.RnD.ice[0]);

  //Advance(corp.remoteServers[0].root[0]);
  //Advance(corp.remoteServers[0].root[0]);
  //Advance(corp.remoteServers[0].root[0]);
  //Advance(corp.remoteServers[0].root[0]);
  //Advance(corp.remoteServers[0].root[0]);
  //Advance(corp.remoteServers[1].root[0]);
  //Advance(corp.remoteServers[1].root[0]);

  /*
	corp.remoteServers[0].ice[1].hostedCards = [];
	var botulus = InstanceCardsPush(systemGateway,4,corp.remoteServers[0].ice[1].hostedCards,1,cardBackTexturesRunner,glowTextures,strengthTextures)[0];
	botulus.host = corp.HQ.ice[1];
	botulus.faceUp = true;
	console.log(JSON.stringify(corp.remoteServers[0].ice[1].hostedCards));
	Trash(botulus);
	console.log(JSON.stringify(corp.remoteServers[0].ice[1].hostedCards));
	*/

  //runner.rig.programs[0].virus = 2;
  //corp.RnD.cards[corp.RnD.cards.length-1].knownToRunner = true;
  //corp.RnD.cards[corp.RnD.cards.length-2].knownToRunner = true;
  //corp.RnD.cards[corp.RnD.cards.length-3].knownToRunner = true;

  //GainCredits(runner,10);
  //GainCredits(corp,20);
  //ChangePhase(phases.corpStartDraw);
  //ChangePhase(phases.runnerEndOfTurn);
  //ChangePhase(phases.runnerStartResponse);
  //AddTags(2);
  //runner.clickTracker = 2;
  //ChangePhase(phases.corpDiscardStart);
  //MakeRun(corp.remoteServers[0]);
  //attackedServer = corp.RnD;
  //ChangePhase(phases.runApproachServer); //i.e. skip all the ice
}
