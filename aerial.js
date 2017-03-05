// ---------
// CONSTANTS
// ---------
var NOTES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
var NOTES_TO_COLORS = {
    'c': "#FF0033",
    'd': "#DD0066",
    'e': "#BB0077",
    'f': "#990099",
    'g': "#7700BB",
    'a': "#6600DD",
    'b': "#3300FF",
    '': "#000000"
};
var NOTES_TO_BUFFERS = {};

var K_ADJACENT = 0.02;
var K_DIAGONAL = Math.sqrt(2 * K_ADJACENT);

// ----------------
// GLOBAL VARIABLES
// ----------------
var canvas = document.getElementById("aerial");
var ctx = canvas.getContext("2d");

var mode = 1;
var grid_size = 25;
var num_instruments = 20;
var width = canvas.width / grid_size;
var grid_margin = 1;

var audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
var timbre = 'xylo';

var instruments = [];
var grid = [];

var time = 0;
var new_date;
var last_date;

var pause = false;
var show_instruments = false;

// -------
// CLASSES
// -------
function NewInstrument() {
    var chord = NOTES[Math.floor(Math.random() * 7)];
    var instrument = {
        'chord': chord,
        'note': RandomNoteFromChord(chord),
        'x': Math.floor(Math.random() * grid_size),
        'y': Math.floor(Math.random() * grid_size),
        'playback': audio_ctx.createBufferSource(),
        'gain': audio_ctx.createGain(),
        'pan': audio_ctx.createStereoPanner(),
        'time_since_last_play': 0
    };
    instrument.pan.value = PanValue(instrument.x);
    instrument.pan.connect(audio_ctx.destination);
    return instrument;
}

function NewElement(i, j) {
    var element = {
        'c': 0,
        'd': 0,
        'e': 0,
        'f': 0,
        'g': 0,
        'a': 0,
        'b': 0,
        'x': j * width + grid_margin / 2,
        'y': i * width + grid_margin / 2
    };
    return element;
}

function NewChords() {
    var chords = {
        'c': 0,
        'd': 0,
        'e': 0,
        'f': 0,
        'g': 0,
        'a': 0,
        'b': 0,
    }
    return chords;
}

// ----------------
// METHODS: Startup
// ----------------
function StartSimulation() {
    pause = true;
    InitializeBuffers();
    ResetInstruments();
    ResetElements();
    DrawAll();
    time = 0;
    last_date = new Date();
    setInterval(Update, 30);
}

function ResetInstruments() {
    for (var i = 0; i < num_instruments; i++) {
        instruments[i] = NewInstrument();
    }
}

function ResetElements() {
    for (var i = 0; i < grid_size; i++) {
        grid[i] = [];
        for (var j = 0; j < grid_size; j++) {
            grid[i][j] = NewElement(i, j);
        }
    }
}

// --------------
// METHODS: Audio
// --------------
function InitializeBuffers() {
    buffer_loader = new BufferLoader(
    audio_ctx,
    [
        'audio/xylo_c.wav',
        'audio/xylo_d.wav',
        'audio/xylo_e.wav',
        'audio/xylo_f.wav',
        'audio/xylo_g.wav',
        'audio/xylo_a.wav',
        'audio/xylo_b.wav',
        'audio/xylo_c2.wav',
        'audio/harp_c.wav',
        'audio/harp_d.wav',
        'audio/harp_e.wav',
        'audio/harp_f.wav',
        'audio/harp_g.wav',
        'audio/harp_hit1.wav',
        'audio/harp_b.wav',
        'audio/harp_c2.wav',
        'audio/harp_hit2.wav',
        'audio/harp_hit3.wav',
        'audio/bell_c.mp3',
        'audio/bell_d.mp3',
        'audio/bell_e.mp3',
        'audio/bell_f.mp3',
        'audio/bell_g.mp3',
        'audio/bell_a.mp3',
        'audio/bell_b.mp3',
        'audio/bell_c.mp3',
        'audio/bell_a2.mp3'
    ],
    InitializeBuffersHelper
    );
    buffer_loader.load();
}

function InitializeBuffersHelper(buffer_list) {
    NOTES_TO_BUFFERS['xylo'] = {};
    NOTES_TO_BUFFERS['harp'] = {};
    NOTES_TO_BUFFERS['bell'] = {};
    for (var i = 0; i < NOTES.length; i++) {
        NOTES_TO_BUFFERS['xylo'][NOTES[i]] = buffer_list[i];
        NOTES_TO_BUFFERS['harp'][NOTES[i]] = buffer_list[i + 8];
        NOTES_TO_BUFFERS['bell'][NOTES[i]] = buffer_list[i + 18];
    }
    // add alternatives.
    NOTES_TO_BUFFERS['xylo']['c2'] = buffer_list[7];
    NOTES_TO_BUFFERS['harp']['c2'] = buffer_list[15];
    NOTES_TO_BUFFERS['harp']['a2'] = buffer_list[16];
    NOTES_TO_BUFFERS['harp']['a3'] = buffer_list[17];
    NOTES_TO_BUFFERS['bell']['a2'] = buffer_list[26]
    for (var i = 0; i < num_instruments; i++) {
        instruments[i].playback.buffer = GetBuffer(instruments[i].note);
        instruments[i].playback.start(0);
        instruments[i].time_since_last_play = 0;
    }
    pause = false;
}

function GetBuffer(note) {
    var buffer;
    if (note == 'c' && (timbre == 'harp' || timbre == 'xylo')) {
        if (Math.random() < .1) {
            buffer = NOTES_TO_BUFFERS[timbre]['c2'];
        } else {
            buffer = NOTES_TO_BUFFERS[timbre]['c'];
        }
    } else if (note == 'a' && timbre == 'harp') {
        var rand = Math.random();
        if (rand < .33) {
            buffer = NOTES_TO_BUFFERS[timbre]['a'];
        }  else if (rand < .66) {
            buffer = NOTES_TO_BUFFERS[timbre]['a2'];
        } else {
            buffer = NOTES_TO_BUFFERS[timbre]['a3'];
        }
    } else if (note == 'a' && timbre == 'bell') {
        var rand = Math.random();
        if (rand < .33) {
            buffer = NOTES_TO_BUFFERS[timbre]['a2'];
        } else {
            buffer = NOTES_TO_BUFFERS[timbre]['a'];
        }
    } else {
        buffer = NOTES_TO_BUFFERS[timbre][note];
    }
    return buffer;
}

function MuteAudio() {
    for (var i = 0; i < num_instruments; i++) {
        instruments[i].gain.gain.value = 0;
    }
}

function UnmuteAudio() {
    for (var i = 0; i < num_instruments; i++) {
        instruments[i].gain.gain.value = .1;
    }
}

// ----------------------
// METHODS: Randomization
// ----------------------
function RandomizeColors() {
    for (var i = 0; i < NOTES.length; i++) {
        NOTES_TO_COLORS[NOTES[i]] = GetRandomColor();
    }
}

function GetRandomColor() {
    var color = "#"
    for (var i = 0; i < 3; i++) {
        var tmp = "00" + Math.floor(Math.random() * 256).toString(16);
        color+=tmp.substr(-2);
    }
    return color;
}

function RandomizeLocations() {
    for (var i = 0; i < num_instruments; i++) {
        instruments[i].x = Math.floor(Math.random() * grid_size);
        instruments[i].y = Math.floor(Math.random() * grid_size);
    }
}

function RandomNoteFromChord(chord) {
    var to_sum = 2 * Math.floor((Math.random() * 3));
    var note_ind = (to_sum + NOTES.indexOf(chord)) % NOTES.length;
    var note = NOTES[note_ind];
    return note;
}

// -----------------
// METHODS: Updating
// -----------------
function IsValidPos(x, y) {
    return x >= 0 && y >= 0 && x < grid_size && y < grid_size;
}

function WeightForNote(element, note) {
    var base_note_pos = NOTES.indexOf(note);
    var base_note = NOTES[base_note_pos];
    var third_note = NOTES[((base_note_pos) + 2) % NOTES.length];
    var fifth_note = NOTES[((base_note_pos) + 4) % NOTES.length];
    var sixth_note = NOTES[((base_note_pos) - 2) % NOTES.length];
    var fourth_note = NOTES[((base_note_pos) - 4) % NOTES.length];
    var weight = element[base_note] + 0.5 * element[third_note] + 0.8 * element[fourth_note] + 0.8 * element[fifth_note] + 0.5 * element[sixth_note];
    return weight;
}

function PanValue(x) {
    return -1 + 2 * (x + .5) / grid_size;
}

function FadeGridElement(element) {
    for (var i = 0; i < NOTES.length; i++) {
        element[NOTES[i]] *= 1.1;
    }
}

function Update() {
    var new_date = new Date(last_date);
    time += new_date.getMilliseconds();
    if (time > 300) {
        if (!pause) {
            UpdateGrid();
            if (Math.random() < .5) {
                for (var i = 0; i < num_instruments; i++) {
                    UpdateInstrument(instruments[i], time);
                }
            }
            DrawAll();
        }
        time -= 300;
    }
    last_date = new Date();
}

function UpdateInstrument(instrument, time) {
    // Select the maximum chord.
    var chords = NewChords();
    for (var i = 0; i < NOTES.length; i++) {
        if (NOTES[i] == instrument.note) { continue; }
        chords[NOTES[i]] += grid[instrument.x][instrument.y][NOTES[i]];
        chords[NOTES[i]] += grid[instrument.x][instrument.y][NOTES[(i + 2) % NOTES.length]];
        chords[NOTES[i]] += grid[instrument.x][instrument.y][NOTES[(i + 4) % NOTES.length]];
    }
    var max_chord = '';
    var max_weight = 0;
    for (var i = 0; i < NOTES.length; i++) {
        if (chords[[NOTES[i]]] > max_weight) {
            max_chord = NOTES[i];
            max_weight = chords[[NOTES[i]]];
        }
    }
    // Update instrument chord and note.
    if (max_chord) {
        if (max_chord != instrument.chord) {
            instrument.chord = max_chord;
            instrument.note = RandomNoteFromChord(max_chord);
            instrument.playback = audio_ctx.createBufferSource();
            instrument.playback.connect(instrument.pan);
            instrument.playback.buffer = GetBuffer(instrument.note);
            instrument.playback.start(0);
            instrument.time_since_last_play = 0;
        } else if (Math.random() < .005) {
            instrument.note = RandomNoteFromChord(instrument.chord);
            instrument.playback = audio_ctx.createBufferSource();
            instrument.playback.connect(instrument.pan);
            instrument.playback.buffer = GetBuffer(instrument.note);
            instrument.playback.start(0);
            instrument.time_since_last_play = 0;
        } else {
            instrument.time_since_last_play += time;
        }
    }
    // Update instrument position.
    var new_x = instrument.x;
    var new_y = instrument.y;
    max_weight = 0;
    var num_switches = 0;
    for (var i = instrument.x - 1; i <= instrument.x + 1; i++) {
        for (var j = instrument.y - 1; j <= instrument.y + 1; j++) {
            // Ignore if the position is invalid.
            if (!IsValidPos(i, j)) { continue; }
            // Don't consider case where position doesn't change.
            if (instrument.x == i && instrument.y == j) { continue; }
            var weight = WeightForNote(grid[i][j], instrument.note);
            if (weight > max_weight) {
                new_x = i;
                new_y = j;
                max_weight = weight;
                num_switches = 0;
            } else if (weight == max_weight) {
                // If another occurrence of max_weight appears, perform reservoir sampling to decide which position to save.
                num_switches += 1;
                if (Math.random() < 1 / num_switches) {
                    new_x = i;
                    new_y = j;
                }
            }
        }
    }
    instrument.x = new_x;
    instrument.y = new_y;
    instrument.pan.value = PanValue(instrument.x);
}

function UpdateGrid() {
    // Fade grid values.
    for (var i = 0; i < grid_size; i++) {
        for (var j = 0; j < grid_size; j++) {
            FadeGridElement(grid[i][j]);
        }
    }
    // Create new grid.
    new_grid = []
    for (var i = 0; i < grid_size; i++) {
        new_grid[i] = [];
        for (var j = 0; j < grid_size; j++) {
            new_grid[i][j] = NewElement(i, j);
        }
    }
    // Update note values based on other grid elements.
    for (var i = 0; i < grid_size; i++) {
        for (var j = 0; j < grid_size; j++) {
            UpdateGridElement(new_grid[i][j], i, j);
        }
    }
    // Update note values based on instruments.
    for (var i = 0; i < num_instruments; i++) {
        new_grid[instruments[i].x][instruments[i].y][instruments[i].note] += Math.pow(.99999, instruments[i].time_since_last_play);
    }
    grid = new_grid;
}

function UpdateGridElement(element, i, j) {
    UpdateGridElementNotes(element, i + 1, j, K_ADJACENT);
    UpdateGridElementNotes(element, i - 1, j, K_ADJACENT);
    UpdateGridElementNotes(element, i, j + 1, K_ADJACENT);
    UpdateGridElementNotes(element, i, j - 1, K_ADJACENT);
    UpdateGridElementNotes(element, i + 1, j + 1, K_DIAGONAL);
    UpdateGridElementNotes(element, i + 1, j - 1, K_DIAGONAL);
    UpdateGridElementNotes(element, i - 1, j + 1, K_DIAGONAL);
    UpdateGridElementNotes(element, i - 1, j - 1, K_DIAGONAL);
}

function UpdateGridElementNotes(element, x, y, k) {
    if (IsValidPos(x, y)) {
        for (var i = 0; i < NOTES.length; i++) {
            element[NOTES[i]] += k * grid[x][y][NOTES[i]];
        }
    }
}

// ----------------
// METHODS: Drawing
// ----------------
function DrawAll() {
    for (var i = 0; i < grid_size; i++) {
        grid[i].forEach(DrawGridElement);
    }
    if (show_instruments) {
        instruments.forEach(DrawInstrument);
    }
}

function DrawBackground() {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.fill();
}

function DrawGridElement(element, index, arr) {
    ctx.beginPath();
    ctx.rect(element.x, element.y, width - grid_margin, width - grid_margin);
    var max_note;
    var max_weight = 0;
    var switch_count = 0;
    for (var i = 0; i < NOTES.length; i++) {
        if (element[NOTES[i]] > max_weight) {
            max_note = NOTES[i];
            max_weight = element[NOTES[i]];
            switch_count = 0;
        } else if (element[NOTES[i]] == max_weight) {
            switch_count++;
            if (Math.random() < 1 / switch_count) {
                max_note = NOTES[i];
                max_weight = element[NOTES[i]];
            }
        }
    }
    if (max_weight == 0) {
        max_note = "";
    }
    ctx.fillStyle = NOTES_TO_COLORS[max_note];
    ctx.fill();
}

function DrawInstrument(instrument, index, arr) {
    font_size = (width - 2 * grid_margin);
    ctx.beginPath()
    ctx.font = font_size + "px Arial";
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = "center";
    ctx.fillText(instrument.note, width * instrument.y + width / 2, width * instrument.x + width / 2 + width / 4 + width / 16);
}

// --------------------
// METHODS: Interaction
// --------------------
document.onkeydown = function (event) {
    switch (event.keyCode) {
        case 32:
            // on spacebar
            pause = !pause;
            if (pause) {
                MuteAudio();
            } else {
                UnmuteAudio();
            }
            break;
        case 67:
            // on' 'c'
            RandomizeColors();
            if (pause) {
                DrawBackground();
                DrawAll();
            }
            break;
        case 82:
            // on 'r'
            RandomizeLocations();
            break;
        case 73:
            // on 'i'
            show_instruments = !show_instruments;
            if (pause) {
                DrawBackground();
                DrawAll();
            }
            break;
        case 49:
            // on '1'
            if (mode != 1) {
                SetModeOne();
            }
            break;
        case 50:
            if (mode != 2) {
                SetModeTwo();
            } 
            break;
        case 51:
            if (mode != 3) {
                SetModeThree();
            }
            break;
        default:
            break;
    }
}

function SetModeOne() {
    mode = 1;
    pause = true;
    grid_size = 25;
    width = canvas.width / grid_size;
    num_instruments = 20;
    NOTES_TO_COLORS = {
        'c': "#FF0033",
        'd': "#DD0066",
        'e': "#BB0077",
        'f': "#990099",
        'g': "#7700BB",
        'a': "#6600DD",
        'b': "#3300FF",
        '': "#000000"
    }
    timbre = 'xylo';
    ResetInstruments();
    ResetElements();
    DrawAll();
    pause = false;
}

function SetModeTwo() {
    mode = 2;
    pause = true;
    grid_size = 100;
    width = canvas.width / grid_size;
    num_instruments = 10;
    NOTES_TO_COLORS = {
        'c': "#77a9f9",
        'd': "#356bc4",
        'e': "#751482",
        'f': "#e8e1a4",
        'g': "#b7777f",
        'a': "#dffc3a",
        'b': "#cedde2",
        '': "#000000"
    }
    timbre = 'bell';
    ResetInstruments();
    ResetElements();
    DrawAll();
    pause = false;
}

function SetModeThree() {
    mode = 3;
    pause = true;
    grid_size = 50;
    width = canvas.width / grid_size;
    num_instruments = 15;
    NOTES_TO_COLORS = {
        'c': "#d15a2b",
        'd': "#593426",
        'e': "#fcef35",
        'f': "#40f9c5",
        'g': "#7c1635",
        'a': "#3a0a2e",
        'b': "#ff0f13",
        '': "#000000"
    }
    timbre = 'harp';
    ResetInstruments();
    ResetElements();
    DrawAll();
    pause = false;
}

// ------
// SCRIPT
// ------
StartSimulation();