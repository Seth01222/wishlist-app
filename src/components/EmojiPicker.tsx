'use client'

import { useState, useMemo } from 'react'

type EmojiEntry = { e: string; k: string }
type Category = { id: string; icon: string; label: string; entries: EmojiEntry[] }

const CATEGORIES: Category[] = [
  {
    id: 'popular', icon: '⭐', label: 'Popular', entries: [
      { e: '🛍️', k: 'shopping bag store' },
      { e: '❤️', k: 'heart love favorite' },
      { e: '⭐', k: 'star favorite gold' },
      { e: '🎁', k: 'gift present birthday' },
      { e: '🔥', k: 'fire hot trending popular' },
      { e: '✨', k: 'sparkle magic glitter' },
      { e: '💫', k: 'dizzy star glow' },
      { e: '🌟', k: 'star glow yellow' },
      { e: '🏆', k: 'trophy winner best gold' },
      { e: '💎', k: 'diamond gem jewel' },
      { e: '🎯', k: 'target goal dart bullseye' },
      { e: '💡', k: 'idea lightbulb bright' },
      { e: '🎉', k: 'party celebrate confetti' },
      { e: '🌈', k: 'rainbow colorful pride' },
      { e: '🍕', k: 'pizza food italian' },
      { e: '📱', k: 'phone mobile iphone android' },
      { e: '👟', k: 'sneaker shoe running' },
      { e: '🎮', k: 'gaming controller video game' },
      { e: '🏠', k: 'home house living' },
      { e: '✈️', k: 'travel airplane plane fly' },
      { e: '🧘', k: 'yoga meditation zen calm' },
      { e: '🎧', k: 'headphones audio music listen' },
      { e: '📚', k: 'books study library read' },
      { e: '🌿', k: 'plant herb green nature' },
    ],
  },
  {
    id: 'shopping', icon: '🛍️', label: 'Shopping & Gifts', entries: [
      { e: '🛍️', k: 'shopping bag store retail' },
      { e: '🛒', k: 'shopping cart grocery' },
      { e: '🎁', k: 'gift present wrap birthday' },
      { e: '🎀', k: 'ribbon bow gift pink' },
      { e: '💝', k: 'gift heart love' },
      { e: '🏷️', k: 'tag price label sale' },
      { e: '🧾', k: 'receipt bill invoice' },
      { e: '💳', k: 'credit card payment visa' },
      { e: '💰', k: 'money bag cash coins' },
      { e: '💵', k: 'dollar bill money green' },
      { e: '💸', k: 'money wings spending flying' },
      { e: '🏬', k: 'store department mall building' },
      { e: '📦', k: 'box package delivery amazon' },
      { e: '🚚', k: 'delivery truck shipping fedex' },
      { e: '🧳', k: 'luggage suitcase travel bags' },
      { e: '👜', k: 'handbag purse tote bag' },
      { e: '👛', k: 'purse wallet small bag' },
      { e: '💼', k: 'briefcase work bag business' },
      { e: '🪙', k: 'coin gold money currency' },
      { e: '💹', k: 'chart growth stocks money' },
      { e: '🏦', k: 'bank finance money' },
      { e: '💴', k: 'yen money japan' },
      { e: '💶', k: 'euro money europe' },
      { e: '📈', k: 'chart up growth stocks' },
    ],
  },
  {
    id: 'fashion', icon: '👗', label: 'Fashion & Clothing', entries: [
      { e: '👗', k: 'dress fashion clothes women' },
      { e: '👔', k: 'necktie suit shirt formal men' },
      { e: '👕', k: 't-shirt shirt casual top' },
      { e: '👖', k: 'jeans pants denim bottoms' },
      { e: '🧥', k: 'coat jacket outerwear' },
      { e: '🧤', k: 'gloves winter hands cold' },
      { e: '🧣', k: 'scarf winter neck wrap' },
      { e: '🎩', k: 'top hat formal magic dapper' },
      { e: '🧢', k: 'cap baseball hat casual' },
      { e: '👒', k: 'sun hat wide brim summer' },
      { e: '🎒', k: 'backpack school bag rucksack' },
      { e: '💍', k: 'ring diamond wedding jewelry' },
      { e: '👓', k: 'glasses eyewear spectacles' },
      { e: '🕶️', k: 'sunglasses cool shades dark' },
      { e: '🥼', k: 'lab coat white jacket' },
      { e: '🩱', k: 'swimsuit one-piece swim' },
      { e: '🩲', k: 'briefs underwear swim trunks' },
      { e: '🩳', k: 'shorts swim summer bottoms' },
      { e: '🧦', k: 'socks feet stockings' },
      { e: '🥻', k: 'sari dress wrap traditional' },
      { e: '🪖', k: 'helmet military hat head' },
      { e: '👚', k: 'womans clothes top shirt' },
      { e: '🩴', k: 'flip flop sandal thong beach' },
      { e: '🎗️', k: 'ribbon awareness fashion accessory' },
    ],
  },
  {
    id: 'footwear', icon: '👟', label: 'Footwear', entries: [
      { e: '👟', k: 'sneaker shoe running sport' },
      { e: '👠', k: 'high heel stiletto women shoes' },
      { e: '👡', k: 'sandal flat women shoe' },
      { e: '👢', k: 'boot women knee high' },
      { e: '🥾', k: 'hiking boot outdoor trail' },
      { e: '🥿', k: 'flat shoe slip on mule' },
      { e: '👞', k: 'shoe dress oxford leather' },
      { e: '🩴', k: 'flip flop thong sandal beach' },
      { e: '⛸️', k: 'ice skate winter sport blade' },
      { e: '🎿', k: 'ski skiing winter snow sport' },
    ],
  },
  {
    id: 'tech', icon: '💻', label: 'Tech & Electronics', entries: [
      { e: '📱', k: 'phone mobile iphone android smartphone' },
      { e: '💻', k: 'laptop computer macbook notebook' },
      { e: '🖥️', k: 'desktop computer monitor screen' },
      { e: '⌨️', k: 'keyboard typing input' },
      { e: '🖱️', k: 'mouse computer pointer' },
      { e: '📷', k: 'camera photo picture photography' },
      { e: '📸', k: 'camera flash photo selfie' },
      { e: '📺', k: 'tv television screen' },
      { e: '🖨️', k: 'printer print document office' },
      { e: '🔋', k: 'battery power charge energy' },
      { e: '🔌', k: 'plug power outlet electric' },
      { e: '💾', k: 'floppy disk save storage' },
      { e: '💿', k: 'cd disc optical media' },
      { e: '📀', k: 'dvd disc bluray media' },
      { e: '📡', k: 'satellite dish signal antenna' },
      { e: '⌚', k: 'watch smartwatch apple wearable' },
      { e: '🖲️', k: 'trackball mouse input' },
      { e: '📟', k: 'pager beeper device' },
      { e: '🧮', k: 'abacus calculator math compute' },
      { e: '🕹️', k: 'joystick arcade game control retro' },
      { e: '📲', k: 'mobile arrow download phone' },
      { e: '☎️', k: 'telephone phone landline call' },
      { e: '📠', k: 'fax machine office printer' },
      { e: '📻', k: 'radio fm am broadcast' },
    ],
  },
  {
    id: 'audio', icon: '🎧', label: 'Audio & Music', entries: [
      { e: '🎵', k: 'music note song melody' },
      { e: '🎶', k: 'music notes songs tunes' },
      { e: '🎸', k: 'guitar rock electric acoustic' },
      { e: '🎹', k: 'piano keyboard music' },
      { e: '🎺', k: 'trumpet brass wind' },
      { e: '🎻', k: 'violin strings classical' },
      { e: '🥁', k: 'drum percussion beat' },
      { e: '🎷', k: 'saxophone sax jazz wind' },
      { e: '🎙️', k: 'microphone mic studio record' },
      { e: '🎚️', k: 'level slider studio audio' },
      { e: '🎛️', k: 'knobs controls mixer audio' },
      { e: '🎤', k: 'microphone karaoke singing' },
      { e: '🎧', k: 'headphones earphones audio listen' },
      { e: '🎼', k: 'musical score sheet music' },
      { e: '📻', k: 'radio fm am broadcast speaker' },
      { e: '🔊', k: 'speaker loud volume sound' },
      { e: '🪗', k: 'accordion music folk' },
      { e: '🪘', k: 'drum long conga beat' },
      { e: '🪕', k: 'banjo strings folk country' },
      { e: '🎙️', k: 'mic podcast studio record' },
    ],
  },
  {
    id: 'gaming', icon: '🎮', label: 'Gaming', entries: [
      { e: '🎮', k: 'controller game console playstation xbox' },
      { e: '🕹️', k: 'joystick arcade game retro' },
      { e: '👾', k: 'alien monster pixel game retro' },
      { e: '🎯', k: 'target bullseye dart goal' },
      { e: '🎲', k: 'dice board game chance roll' },
      { e: '♟️', k: 'chess piece strategy game' },
      { e: '🃏', k: 'card game joker poker' },
      { e: '🎰', k: 'slot machine casino luck' },
      { e: '🧩', k: 'puzzle jigsaw pieces solve' },
      { e: '🎳', k: 'bowling ball pins strike' },
      { e: '🏹', k: 'bow arrow archery aim' },
      { e: '⚔️', k: 'swords fight battle duel' },
      { e: '🛡️', k: 'shield defense protect' },
      { e: '🐉', k: 'dragon fantasy game rpg' },
      { e: '🪄', k: 'magic wand spell wizard' },
      { e: '🔮', k: 'crystal ball magic predict future' },
      { e: '🗡️', k: 'dagger knife blade weapon' },
      { e: '🏰', k: 'castle medieval fortress game' },
      { e: '🌀', k: 'cyclone swirl dizzy spin' },
      { e: '💀', k: 'skull death danger game over' },
    ],
  },
  {
    id: 'home', icon: '🏠', label: 'Home & Living', entries: [
      { e: '🏠', k: 'home house living building' },
      { e: '🏡', k: 'house garden yard home' },
      { e: '🛋️', k: 'couch sofa living room furniture' },
      { e: '🛏️', k: 'bed bedroom sleep furniture' },
      { e: '🪑', k: 'chair seat furniture sit' },
      { e: '🚿', k: 'shower bath clean bathroom' },
      { e: '🛁', k: 'bathtub bath soak relax' },
      { e: '🪴', k: 'plant potted green indoor' },
      { e: '🕯️', k: 'candle flame light cozy' },
      { e: '🪟', k: 'window glass view light' },
      { e: '🚪', k: 'door entry room building' },
      { e: '🧹', k: 'broom sweep clean floor' },
      { e: '🧺', k: 'basket laundry wicker storage' },
      { e: '🧻', k: 'toilet paper roll bathroom' },
      { e: '🧼', k: 'soap clean wash bubble' },
      { e: '🪣', k: 'bucket mop clean water' },
      { e: '🪞', k: 'mirror reflect glass room' },
      { e: '🍳', k: 'cooking frying pan kitchen food' },
      { e: '🥄', k: 'spoon kitchen utensil' },
      { e: '🍴', k: 'fork knife utensils eating' },
      { e: '🫖', k: 'teapot tea kettle hot drink' },
      { e: '🧊', k: 'ice cube cold freezer' },
      { e: '🔑', k: 'key lock door entry security' },
      { e: '🏮', k: 'lantern light decoration' },
    ],
  },
  {
    id: 'food', icon: '🍕', label: 'Food & Drink', entries: [
      { e: '🍕', k: 'pizza italian food slice' },
      { e: '🍔', k: 'burger hamburger fast food' },
      { e: '🌮', k: 'taco mexican food' },
      { e: '🌯', k: 'wrap burrito sandwich' },
      { e: '🍜', k: 'noodles ramen soup asian' },
      { e: '🍣', k: 'sushi japanese fish rice' },
      { e: '🍱', k: 'bento box lunch japanese' },
      { e: '🥗', k: 'salad green healthy bowl' },
      { e: '🍩', k: 'donut sweet pastry dessert' },
      { e: '🎂', k: 'birthday cake celebration' },
      { e: '🧁', k: 'cupcake sweet dessert frosting' },
      { e: '🍰', k: 'cake slice dessert sweet' },
      { e: '🍫', k: 'chocolate bar candy sweet' },
      { e: '🍬', k: 'candy sweet sugar treat' },
      { e: '🍭', k: 'lollipop candy swirl sweet' },
      { e: '☕', k: 'coffee hot drink espresso latte' },
      { e: '🍵', k: 'tea hot drink green matcha' },
      { e: '🧋', k: 'bubble tea boba drink milk' },
      { e: '🍺', k: 'beer cold drink pub bar' },
      { e: '🍷', k: 'wine red white glass drink' },
      { e: '🥂', k: 'champagne toast celebrate clink' },
      { e: '🍹', k: 'tropical cocktail drink colorful' },
      { e: '🥤', k: 'cup straw drink soda smoothie' },
      { e: '🍦', k: 'soft serve ice cream sweet' },
      { e: '🍎', k: 'apple red fruit healthy' },
      { e: '🍇', k: 'grapes fruit purple wine' },
      { e: '🥑', k: 'avocado green fruit healthy' },
      { e: '🍿', k: 'popcorn movie snack cinema' },
      { e: '🥞', k: 'pancakes breakfast stack maple' },
      { e: '🫕', k: 'fondue pot cooking stew' },
    ],
  },
  {
    id: 'beauty', icon: '💄', label: 'Beauty & Health', entries: [
      { e: '💄', k: 'lipstick makeup cosmetics beauty' },
      { e: '💅', k: 'nail polish manicure beauty spa' },
      { e: '🪥', k: 'toothbrush teeth clean oral dental' },
      { e: '💊', k: 'pill medicine tablet health' },
      { e: '🩺', k: 'stethoscope doctor medical health' },
      { e: '🩹', k: 'bandage wound adhesive heal' },
      { e: '🧴', k: 'lotion cream bottle skincare' },
      { e: '🧖', k: 'face massage spa relax beauty' },
      { e: '💆', k: 'face massage relax spa head' },
      { e: '🪷', k: 'lotus flower beauty spa zen' },
      { e: '💋', k: 'kiss lips red beauty love' },
      { e: '🌸', k: 'cherry blossom flower pink beauty' },
      { e: '🧘', k: 'meditation yoga zen calm health' },
      { e: '🦷', k: 'tooth dental health teeth' },
      { e: '👁️', k: 'eye vision look see' },
      { e: '🧬', k: 'dna genetics science health' },
      { e: '🏥', k: 'hospital medical health building' },
      { e: '💪', k: 'muscle arm strong flex fitness' },
      { e: '🫀', k: 'heart organ health body' },
      { e: '🫁', k: 'lungs breathing health organ' },
    ],
  },
  {
    id: 'sports', icon: '🏋️', label: 'Sports & Fitness', entries: [
      { e: '⚽', k: 'soccer football sport ball' },
      { e: '🏀', k: 'basketball sport ball orange' },
      { e: '🏈', k: 'american football sport nfl' },
      { e: '⚾', k: 'baseball sport ball mlb' },
      { e: '🎾', k: 'tennis sport ball racket' },
      { e: '🏐', k: 'volleyball sport beach ball' },
      { e: '🏉', k: 'rugby sport oval ball' },
      { e: '🥏', k: 'frisbee disc flying sport' },
      { e: '🎱', k: 'pool billiards eight ball' },
      { e: '🏓', k: 'ping pong table tennis' },
      { e: '🏸', k: 'badminton sport shuttlecock' },
      { e: '🥊', k: 'boxing glove fight punch' },
      { e: '🥋', k: 'martial arts karate judo gi' },
      { e: '🎿', k: 'ski skiing winter sport snow' },
      { e: '🛷', k: 'sled sledding winter snow' },
      { e: '🏋️', k: 'weightlifting gym strength workout' },
      { e: '🤸', k: 'gymnastics cartwheel acrobat' },
      { e: '🧘', k: 'yoga meditation zen flexibility' },
      { e: '🏊', k: 'swimming pool sport water' },
      { e: '🚴', k: 'cycling bike bicycle sport' },
      { e: '🏄', k: 'surfing surf wave beach sport' },
      { e: '🤿', k: 'diving snorkel scuba underwater' },
      { e: '🧗', k: 'climbing rock wall sport' },
      { e: '🏇', k: 'horse racing sport equestrian' },
      { e: '⛳', k: 'golf flag hole putt sport' },
      { e: '🏒', k: 'hockey stick ice sport' },
      { e: '🎣', k: 'fishing rod fish hobby' },
      { e: '🏹', k: 'archery bow arrow aim' },
      { e: '🛹', k: 'skateboard skate trick sport' },
      { e: '🛼', k: 'roller skate rink inline sport' },
    ],
  },
  {
    id: 'travel', icon: '✈️', label: 'Travel', entries: [
      { e: '✈️', k: 'airplane plane fly travel flight' },
      { e: '🚗', k: 'car drive automobile road trip' },
      { e: '🚕', k: 'taxi cab yellow transport' },
      { e: '🏎️', k: 'race car fast sport speed' },
      { e: '🛻', k: 'pickup truck vehicle transport' },
      { e: '🚌', k: 'bus public transport commute' },
      { e: '🚂', k: 'steam locomotive train railway' },
      { e: '🚁', k: 'helicopter fly air transport' },
      { e: '🛩️', k: 'small plane jet fly travel' },
      { e: '🚀', k: 'rocket space launch fly' },
      { e: '🛸', k: 'ufo alien spaceship flying saucer' },
      { e: '⛵', k: 'sailboat wind water sea' },
      { e: '🚤', k: 'speedboat fast water' },
      { e: '🛥️', k: 'motorboat speed water' },
      { e: '🏝️', k: 'island tropical beach vacation' },
      { e: '🗺️', k: 'map world navigate explore' },
      { e: '🌍', k: 'earth globe world africa europe' },
      { e: '🌎', k: 'earth globe americas world' },
      { e: '🌏', k: 'earth globe asia australia' },
      { e: '🗼', k: 'eiffel tower paris france landmark' },
      { e: '🏔️', k: 'mountain peak snow hike' },
      { e: '🏕️', k: 'camping tent outdoor nature' },
      { e: '🎡', k: 'ferris wheel fair amusement park' },
      { e: '🏖️', k: 'beach sand sun vacation tropical' },
      { e: '🌃', k: 'night city stars urban skyline' },
      { e: '🗽', k: 'statue liberty new york usa' },
      { e: '🎠', k: 'carousel merry-go-round fair' },
      { e: '🧭', k: 'compass navigate direction' },
      { e: '⛩️', k: 'shinto shrine japan gate torii' },
      { e: '🌅', k: 'sunrise sunset horizon dawn' },
    ],
  },
  {
    id: 'nature', icon: '🌿', label: 'Animals & Nature', entries: [
      { e: '🐾', k: 'paw print animal pet track' },
      { e: '🐶', k: 'dog puppy pet cute canine' },
      { e: '🐱', k: 'cat kitten pet cute feline' },
      { e: '🐭', k: 'mouse rodent pet small' },
      { e: '🐹', k: 'hamster rodent pet cute' },
      { e: '🐰', k: 'rabbit bunny easter cute' },
      { e: '🦊', k: 'fox orange sly clever cunning' },
      { e: '🐺', k: 'wolf howl wild fierce night' },
      { e: '🐻', k: 'bear brown teddy cute' },
      { e: '🐼', k: 'panda bear black white china' },
      { e: '🐸', k: 'frog green pond amphibian' },
      { e: '🐯', k: 'tiger wild cat stripe fierce' },
      { e: '🦁', k: 'lion king wild big cat' },
      { e: '🐮', k: 'cow moo milk farm animal' },
      { e: '🐷', k: 'pig oink farm mud cute' },
      { e: '🐔', k: 'chicken hen farm bird' },
      { e: '🐧', k: 'penguin bird arctic cold' },
      { e: '🦆', k: 'duck bird water pond' },
      { e: '🦅', k: 'eagle bird raptor sky soar' },
      { e: '🦉', k: 'owl bird wise night' },
      { e: '🦋', k: 'butterfly insect beautiful wings' },
      { e: '🐝', k: 'bee honey insect yellow buzz' },
      { e: '🌸', k: 'cherry blossom flower pink spring' },
      { e: '🌺', k: 'hibiscus flower tropical red' },
      { e: '🌻', k: 'sunflower yellow bright sun' },
      { e: '🌹', k: 'rose red flower love romantic' },
      { e: '🌷', k: 'tulip flower spring pink' },
      { e: '🌲', k: 'evergreen tree pine forest' },
      { e: '🌴', k: 'palm tree tropical beach coconut' },
      { e: '🌵', k: 'cactus desert green prickly' },
      { e: '🍀', k: 'four leaf clover lucky green' },
      { e: '🌿', k: 'herb leaf green plant nature' },
      { e: '🍂', k: 'maple leaf fall autumn brown' },
      { e: '🍁', k: 'maple leaf canada red fall' },
      { e: '🍄', k: 'mushroom fungi red white spots' },
      { e: '🐠', k: 'tropical fish colorful sea ocean' },
      { e: '🐋', k: 'whale ocean blue big sea' },
      { e: '🦝', k: 'raccoon trash bandit masked' },
      { e: '🦋', k: 'butterfly wings transform' },
      { e: '🌊', k: 'wave ocean water sea surf' },
    ],
  },
  {
    id: 'education', icon: '📚', label: 'Books & Learning', entries: [
      { e: '📚', k: 'books stack study library read' },
      { e: '📖', k: 'open book read study page' },
      { e: '📝', k: 'memo notepad writing notes' },
      { e: '✏️', k: 'pencil write draw school' },
      { e: '🖊️', k: 'pen write ink school' },
      { e: '🖋️', k: 'fountain pen write ink elegant' },
      { e: '📏', k: 'ruler measure straight line' },
      { e: '📐', k: 'triangular ruler geometry math' },
      { e: '🔬', k: 'microscope science lab biology' },
      { e: '🔭', k: 'telescope stars space astronomy' },
      { e: '🎓', k: 'graduation cap degree university diploma' },
      { e: '🏫', k: 'school building education learning' },
      { e: '📊', k: 'bar chart graph data statistics' },
      { e: '📋', k: 'clipboard notes list tasks' },
      { e: '🗒️', k: 'notepad spiral notes writing' },
      { e: '📓', k: 'notebook journal writing study' },
      { e: '🖥️', k: 'computer monitor screen learning' },
      { e: '🧮', k: 'abacus calculator math compute' },
      { e: '📌', k: 'pushpin red thumbtack location mark' },
      { e: '🗂️', k: 'file dividers organize folders' },
    ],
  },
  {
    id: 'art', icon: '🎨', label: 'Art & Creativity', entries: [
      { e: '🎨', k: 'art palette painting colors creative' },
      { e: '🖼️', k: 'picture frame art painting gallery' },
      { e: '🎭', k: 'theater masks drama performance arts' },
      { e: '🎬', k: 'film clapper movie production cinema' },
      { e: '🎥', k: 'movie camera film video' },
      { e: '📽️', k: 'film projector cinema old movie' },
      { e: '🖌️', k: 'paintbrush art painting creative' },
      { e: '✂️', k: 'scissors cut craft DIY' },
      { e: '🪡', k: 'sewing thread needle craft' },
      { e: '🧵', k: 'thread spool sewing craft' },
      { e: '🧶', k: 'yarn knitting crochet wool' },
      { e: '🎪', k: 'circus tent perform show' },
      { e: '🗿', k: 'statue moai stone face art' },
      { e: '🏺', k: 'amphora pot ancient art' },
      { e: '🪆', k: 'nesting dolls matryoshka russian' },
      { e: '🎠', k: 'carousel merry-go-round fair art' },
      { e: '🖍️', k: 'crayon color draw kids art' },
      { e: '📷', k: 'camera photography art capture' },
      { e: '🎞️', k: 'film strip frames cinema retro' },
      { e: '🎤', k: 'mic performance singing art' },
    ],
  },
  {
    id: 'celebration', icon: '🎉', label: 'Celebration', entries: [
      { e: '🎉', k: 'party popper celebrate confetti' },
      { e: '🎊', k: 'confetti ball celebrate party' },
      { e: '🎈', k: 'balloon celebrate red party' },
      { e: '🎆', k: 'fireworks celebrate sparkle' },
      { e: '🎇', k: 'sparkler firework celebrate' },
      { e: '🧨', k: 'firecracker chinese new year bang' },
      { e: '🎃', k: 'pumpkin halloween spooky fall' },
      { e: '🎄', k: 'christmas tree holiday winter' },
      { e: '🥳', k: 'party face celebrate birthday fun' },
      { e: '🎖️', k: 'medal decoration honor award' },
      { e: '🏆', k: 'trophy award winner gold' },
      { e: '🥇', k: 'first place gold medal winner' },
      { e: '🥈', k: 'second place silver medal' },
      { e: '🥉', k: 'third place bronze medal' },
      { e: '🏅', k: 'sports medal award win' },
      { e: '🎗️', k: 'ribbon awareness cause celebration' },
      { e: '🌟', k: 'glowing star special favorite' },
      { e: '✨', k: 'sparkles magic celebration glitter' },
      { e: '💫', k: 'dizzy star spinning special' },
      { e: '🎁', k: 'gift present wrap celebration' },
    ],
  },
  {
    id: 'tools', icon: '🔧', label: 'Tools & Work', entries: [
      { e: '🔧', k: 'wrench tool fix repair mechanic' },
      { e: '🔨', k: 'hammer tool build nail hit' },
      { e: '⚙️', k: 'gear settings cog mechanical' },
      { e: '🔩', k: 'nut bolt screw mechanic fastener' },
      { e: '🛠️', k: 'tools hammer wrench repair build' },
      { e: '⛏️', k: 'pick axe mining dig tool' },
      { e: '🪛', k: 'screwdriver screw tool fix' },
      { e: '🪚', k: 'saw cut carpentry wood tool' },
      { e: '🧲', k: 'magnet attract metal force' },
      { e: '💼', k: 'briefcase work business professional' },
      { e: '🗂️', k: 'file dividers organize folders' },
      { e: '📁', k: 'folder file organize documents' },
      { e: '📎', k: 'paperclip attach fasten' },
      { e: '🗃️', k: 'card file box storage organize' },
      { e: '🗄️', k: 'file cabinet storage organize' },
      { e: '🔑', k: 'key lock door entry access' },
      { e: '🗝️', k: 'old key vintage skeleton lock' },
      { e: '🔐', k: 'locked key secure padlock' },
      { e: '🔒', k: 'locked padlock secure private' },
      { e: '📦', k: 'box package shipping storage' },
    ],
  },
  {
    id: 'science', icon: '🧪', label: 'Science & Space', entries: [
      { e: '🔬', k: 'microscope science lab biology' },
      { e: '🔭', k: 'telescope space stars astronomy' },
      { e: '🧬', k: 'dna genetics science helix biology' },
      { e: '🧪', k: 'test tube experiment lab chemical' },
      { e: '🧫', k: 'petri dish bacteria lab culture' },
      { e: '🧲', k: 'magnet force attract science' },
      { e: '⚛️', k: 'atom nuclear science physics' },
      { e: '🌌', k: 'galaxy milky way space stars' },
      { e: '🪐', k: 'planet saturn rings space' },
      { e: '🌙', k: 'crescent moon night sky' },
      { e: '⭐', k: 'star yellow sky space' },
      { e: '☀️', k: 'sun solar bright day energy' },
      { e: '❄️', k: 'snowflake cold winter ice freeze' },
      { e: '⚡', k: 'lightning bolt electric power energy' },
      { e: '🌊', k: 'wave ocean water sea surf' },
      { e: '🌋', k: 'volcano eruption fire mountain lava' },
      { e: '🌪️', k: 'tornado twister storm wind' },
      { e: '🌈', k: 'rainbow colorful light spectrum' },
      { e: '☄️', k: 'comet meteor space streak' },
      { e: '🔮', k: 'crystal ball magic predict future' },
    ],
  },
]

function EmojiBtn({ emoji, selected, onSelect }: { emoji: string; selected: boolean; onSelect: (e: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(emoji)}
      title={emoji}
      className={`w-9 h-9 text-xl rounded-lg spring flex items-center justify-center shrink-0 ${selected ? 'scale-110' : 'hover:bg-raised'}`}
      style={selected ? { background: 'var(--a100)', boxShadow: '0 0 0 2px var(--a500)' } : {}}
    >
      {emoji}
    </button>
  )
}

export default function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('popular')

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    const results: { category: Category; entries: EmojiEntry[] }[] = []
    for (const cat of CATEGORIES) {
      const matched = cat.entries.filter(({ e, k }) => e.includes(q) || k.includes(q))
      if (matched.length) results.push({ category: cat, entries: matched })
    }
    return results
  }, [search])

  const activeCategory = CATEGORIES.find(c => c.id === activeTab) ?? CATEGORIES[0]

  return (
    <div className="border border-line rounded-xl overflow-hidden bg-card">
      {/* Search bar */}
      <div className="p-2 border-b border-line">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-raised border border-line text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
        />
      </div>

      {/* Category tabs — only shown when not searching */}
      {!search && (
        <div className="flex overflow-x-auto scrollbar-hide border-b border-line">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              title={cat.label}
              className="flex-none px-2.5 py-2 text-lg transition-colors hover:bg-raised/60"
              style={activeTab === cat.id
                ? { borderBottom: '2px solid var(--a500)', background: 'var(--a50)' }
                : { borderBottom: '2px solid transparent' }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="overflow-y-auto scrollbar-hide p-2" style={{ height: '176px' }}>
        {searchResults ? (
          searchResults.length === 0 ? (
            <p className="text-center text-ghost text-sm pt-8">No emojis found</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map(({ category, entries }) => (
                <div key={category.id}>
                  <p className="text-[10px] font-medium text-ghost uppercase tracking-wider mb-1 px-0.5">{category.label}</p>
                  <div className="flex flex-wrap">
                    {entries.map(({ e }) => (
                      <EmojiBtn key={e} emoji={e} selected={value === e} onSelect={onChange} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-wrap">
            {activeCategory.entries.map(({ e }) => (
              <EmojiBtn key={e} emoji={e} selected={value === e} onSelect={onChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
