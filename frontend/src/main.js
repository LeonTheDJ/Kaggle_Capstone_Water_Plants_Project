import './style.css';

// Default mock plants to pre-fill the application if empty (so the user gets a "wow" first experience!)
const DEFAULT_PLANTS = [
  {
    id: "default-1",
    name: "Großes Basilikum",
    species: "Kräuter (Wasserliebend)",
    lastWatered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    sunHours: 6.0,
    imageUrl: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=300&auto=format&fit=crop&q=80",
    description: "Hauptbalkon, Mitte. Mag viel Wasser.",
    moisture_level: 65,
    status: "Healthy",
    next_watering_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    explanation: "Das Basilikum hat moderate Temperaturen hinter sich. Es wird in ca. 1 Tag Wasser benötigen."
  },
  {
    id: "default-2",
    name: "Hängende Erdbeere",
    species: "Obst & Beeren",
    lastWatered: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    sunHours: 5.0,
    imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&auto=format&fit=crop&q=80",
    description: "Am Geländer links.",
    moisture_level: 22,
    status: "Water Now",
    next_watering_date: new Date().toISOString().split('T')[0],
    explanation: "Die Erdbeere ist seit 4 Tagen trocken. Durch die Sonneneinstrahlung ist der Boden ausgetrocknet!"
  },
  {
    id: "default-3",
    name: "Kleine Aloe Vera",
    species: "Sukkulenten & Kakteen",
    lastWatered: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    sunHours: 3.0,
    imageUrl: "https://images.unsplash.com/photo-1509423306649-46dc9734f49b?w=300&auto=format&fit=crop&q=80",
    description: "Im Schattenregal oben.",
    moisture_level: 80,
    status: "Healthy",
    next_watering_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    explanation: "Als Sukkulente verbraucht Aloe Vera sehr wenig Wasser. Trotz 10 Tagen ohne Gießen ist die Erde feucht genug."
  }
];

const DEFAULT_BALCONY = {
  city: "München",
  zipCode: "80331",
  defaultSunHours: 5.0,
  isCovered: false
};

// Fallback Unsplash Image when user leaves image blank
const FALLBACK_PLANT_IMAGE = "https://images.unsplash.com/photo-1545241047-6083a3684587?w=300&auto=format&fit=crop&q=80";

// State
let state = {
  balcony: { ...DEFAULT_BALCONY },
  plants: []
};

// DOM Elements
const elDisplayLocation = document.getElementById("display-location");
const elDisplaySun = document.getElementById("display-sun");
const elDisplayCovered = document.getElementById("display-covered");
const elPlantCount = document.getElementById("plant-count");
const elPlantsGrid = document.getElementById("plants-grid");
const elLoadingOverlay = document.getElementById("loading-overlay");
const elLoadingText = document.getElementById("loading-text");

// Buttons & Actions
const btnEditBalcony = document.getElementById("btn-edit-balcony");
const btnAddPlant = document.getElementById("btn-add-plant");
const btnAnalyze = document.getElementById("btn-analyze");
const btnBackupExport = document.getElementById("btn-backup-export");
const btnBackupImport = document.getElementById("btn-backup-import");
const backupFileInput = document.getElementById("backup-file-input");

// Modals
const modalPlant = document.getElementById("modal-plant");
const modalBalcony = document.getElementById("modal-balcony");

// Forms
const formPlant = document.getElementById("form-plant");
const formBalcony = document.getElementById("form-balcony");

// Close buttons
const closePlantModal = document.getElementById("close-modal-plant");
const closeBalconyModal = document.getElementById("close-modal-balcony");
const btnCancelPlant = document.getElementById("btn-cancel-plant");
const btnCancelBalcony = document.getElementById("btn-cancel-balcony");

// Form inputs
const fPlantId = document.getElementById("field-plant-id");
const fPlantName = document.getElementById("field-plant-name");
const fPlantSpecies = document.getElementById("field-plant-species");
const fPlantSun = document.getElementById("field-plant-sun");
const fPlantLastWatered = document.getElementById("field-plant-last-watered");
const fPlantImage = document.getElementById("field-plant-image");
const fPlantDesc = document.getElementById("field-plant-desc");

const fBalconyCity = document.getElementById("field-balcony-city");
const fBalconyZip = document.getElementById("field-balcony-zip");
const fBalconySun = document.getElementById("field-balcony-sun");
const fBalconyCovered = document.getElementById("field-balcony-covered");

// Helper: Load data from LocalStorage
function loadState() {
  const storedBalcony = localStorage.getItem("floracast_balcony");
  const storedPlants = localStorage.getItem("floracast_plants");

  if (storedBalcony) {
    state.balcony = JSON.parse(storedBalcony);
  } else {
    localStorage.setItem("floracast_balcony", JSON.stringify(state.balcony));
  }

  if (storedPlants) {
    state.plants = JSON.parse(storedPlants);
  } else {
    state.plants = [...DEFAULT_PLANTS];
    localStorage.setItem("floracast_plants", JSON.stringify(state.plants));
  }
}

// Helper: Save state to LocalStorage
function saveState() {
  localStorage.setItem("floracast_balcony", JSON.stringify(state.balcony));
  localStorage.setItem("floracast_plants", JSON.stringify(state.plants));
}

// UI Update: Render Balcony Summary
function updateBalconyUI() {
  elDisplayLocation.textContent = `${state.balcony.city} (${state.balcony.zipCode})`;
  elDisplaySun.textContent = `${state.balcony.defaultSunHours} Std.`;
  elDisplayCovered.innerHTML = state.balcony.isCovered 
    ? '<span class="status-yes"><i class="fa-solid fa-circle-check"></i> Ja</span>' 
    : '<span class="status-no"><i class="fa-solid fa-circle-xmark"></i> Nein</span>';
}

// Helper: Calculate days between dates
function getDaysSince(isoDateString) {
  const date = new Date(isoDateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) return "Gerade eben";
    return `Vor ${diffHours} Std.`;
  }
  return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

// UI Update: Render Plant Cards
function renderPlants() {
  elPlantCount.textContent = state.plants.length;
  elPlantsGrid.innerHTML = "";

  if (state.plants.length === 0) {
    elPlantsGrid.innerHTML = `
      <div class="no-plants-placeholder">
        <i class="fa-solid fa-seedling"></i>
        <p>Noch keine Pflanzen erfasst. Füge deine erste Pflanze hinzu!</p>
      </div>
    `;
    return;
  }

  state.plants.forEach(plant => {
    // Determine card status styling
    let statusClass = "status-healthy";
    let statusLabel = "GUT";
    let statusBadgeClass = "healthy";

    if (plant.status === "Water Now") {
      statusClass = "status-now";
      statusLabel = "JETZT!";
      statusBadgeClass = "now";
    } else if (plant.status === "Water Soon") {
      statusClass = "status-soon";
      statusLabel = "BALD";
      statusBadgeClass = "soon";
    }

    const card = document.createElement("div");
    card.className = `plant-card glass ${statusClass}`;
    card.id = `plant-${plant.id}`;

    // Format next watering date nicely
    let formattedNextWatering = "-";
    if (plant.next_watering_date) {
      const nextDate = new Date(plant.next_watering_date);
      formattedNextWatering = nextDate.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit' });
    }

    const imgUrl = plant.imageUrl && plant.imageUrl.trim() !== "" ? plant.imageUrl : FALLBACK_PLANT_IMAGE;
    const moistureVal = plant.moisture_level !== undefined ? `${plant.moisture_level}%` : "-";

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${imgUrl}" class="card-img" alt="${plant.name}" onerror="this.src='${FALLBACK_PLANT_IMAGE}';" />
        <span class="status-badge ${statusBadgeClass}">${statusLabel}</span>
        
        <div class="moisture-droplet-badge" title="Bodenfeuchtigkeit">
          <i class="fa-solid fa-droplet"></i>
          <span>${moistureVal}</span>
        </div>
      </div>
      
      <div class="card-details">
        <div class="plant-title">
          <h3>${plant.name}</h3>
          <span class="species">${plant.species || "Unbekannte Art"}</span>
        </div>
        
        <div class="plant-stats">
          <div class="stat-row">
            <span class="stat-label">Gegossen:</span>
            <span class="stat-val">${getDaysSince(plant.lastWatered)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Sonne/Tag:</span>
            <span class="stat-val">${plant.sunHours} Std.</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Nächstes Gießen:</span>
            <span class="stat-val" style="font-weight: 700;">${formattedNextWatering}</span>
          </div>
        </div>
        
        <div class="ai-prediction-box" title="KI Analyse-Begründung">
          ${plant.explanation || "Noch keine Analyse durchgeführt. Starte die KI-Analyse."}
        </div>
        
        <div class="card-footer">
          <button class="btn btn-water btn-action-water" data-id="${plant.id}">
            <i class="fa-solid fa-bucket"></i> Gegossen
          </button>
          <button class="btn btn-icon-only btn-edit-plant-icon btn-action-edit" data-id="${plant.id}" title="Bearbeiten">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn btn-icon-only btn-action-delete" data-id="${plant.id}" title="Löschen">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Attach Event Listeners to Card Buttons
    card.querySelector(".btn-action-water").addEventListener("click", (e) => {
      e.stopPropagation();
      waterPlant(plant.id);
    });

    card.querySelector(".btn-action-edit").addEventListener("click", (e) => {
      e.stopPropagation();
      openEditPlantModal(plant.id);
    });

    card.querySelector(".btn-action-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deletePlant(plant.id);
    });

    elPlantsGrid.appendChild(card);
  });
}

// Action: Water Plant (Resets lastWatered timestamp to now)
function waterPlant(id) {
  const plantIndex = state.plants.findIndex(p => p.id === id);
  if (plantIndex !== -1) {
    state.plants[plantIndex].lastWatered = new Date().toISOString();
    state.plants[plantIndex].moisture_level = 100;
    state.plants[plantIndex].status = "Healthy";
    state.plants[plantIndex].explanation = "Frisch gegossen! Die Erde ist voll gesättigt.";
    saveState();
    renderPlants();
  }
}

// Action: Delete Plant
function deletePlant(id) {
  const plant = state.plants.find(p => p.id === id);
  if (plant && confirm(`Möchtest du die Pflanze "${plant.name}" wirklich entfernen?`)) {
    state.plants = state.plants.filter(p => p.id !== id);
    saveState();
    renderPlants();
  }
}

// Modal: Open Add Plant
function openAddPlantModal() {
  fPlantId.value = "";
  fPlantName.value = "";
  fPlantSpecies.value = "";
  fPlantSun.value = state.balcony.defaultSunHours; // Suggest balcony default
  
  // Set default datetime-local to current local time
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  fPlantLastWatered.value = now.toISOString().slice(0, 16);
  
  fPlantImage.value = "";
  fPlantDesc.value = "";
  
  document.getElementById("modal-plant-title").textContent = "Neue Pflanze hinzufügen";
  modalPlant.classList.add("show");
}

// Modal: Open Edit Plant
function openEditPlantModal(id) {
  const plant = state.plants.find(p => p.id === id);
  if (!plant) return;

  fPlantId.value = plant.id;
  fPlantName.value = plant.name;
  fPlantSpecies.value = plant.species || "";
  fPlantSun.value = plant.sunHours;
  
  // Format ISO to local datetime string for input field
  const date = new Date(plant.lastWatered);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  fPlantLastWatered.value = date.toISOString().slice(0, 16);
  
  fPlantImage.value = plant.imageUrl || "";
  fPlantDesc.value = plant.description || "";
  
  document.getElementById("modal-plant-title").textContent = "Pflanze bearbeiten";
  modalPlant.classList.add("show");
}

// Modal: Open Balcony Config
function openBalconyModal() {
  fBalconyCity.value = state.balcony.city;
  fBalconyZip.value = state.balcony.zipCode;
  fBalconySun.value = state.balcony.defaultSunHours;
  fBalconyCovered.checked = state.balcony.isCovered;
  modalBalcony.classList.add("show");
}

// Modal close triggers
const closeModals = () => {
  modalPlant.classList.remove("show");
  modalBalcony.classList.remove("show");
};

closePlantModal.addEventListener("click", closeModals);
closeBalconyModal.addEventListener("click", closeModals);
btnCancelPlant.addEventListener("click", closeModals);
btnCancelBalcony.addEventListener("click", closeModals);

window.addEventListener("click", (e) => {
  if (e.target === modalPlant || e.target === modalBalcony) {
    closeModals();
  }
});

// Submit: Plant Form
formPlant.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const id = fPlantId.value;
  const name = fPlantName.value.trim();
  const species = fPlantSpecies.value.trim();
  const sunHours = parseFloat(fPlantSun.value);
  const lastWatered = new Date(fPlantLastWatered.value).toISOString();
  const imageUrl = fPlantImage.value.trim();
  const description = fPlantDesc.value.trim();

  if (id) {
    // Edit existing plant
    const index = state.plants.findIndex(p => p.id === id);
    if (index !== -1) {
      state.plants[index] = {
        ...state.plants[index],
        name,
        species,
        sunHours,
        lastWatered,
        imageUrl,
        description
      };
    }
  } else {
    // Add new plant
    const newPlant = {
      id: "plant-" + Math.random().toString(36).substr(2, 9),
      name,
      species,
      sunHours,
      lastWatered,
      imageUrl,
      description,
      moisture_level: undefined,
      status: "Healthy",
      next_watering_date: undefined,
      explanation: undefined
    };
    state.plants.push(newPlant);
  }

  saveState();
  renderPlants();
  closeModals();
});

// Submit: Balcony Form
formBalcony.addEventListener("submit", (e) => {
  e.preventDefault();
  
  state.balcony.city = fBalconyCity.value.trim();
  state.balcony.zipCode = fBalconyZip.value.trim();
  state.balcony.defaultSunHours = parseFloat(fBalconySun.value);
  state.balcony.isCovered = fBalconyCovered.checked;

  saveState();
  updateBalconyUI();
  closeModals();
});

// Action: Trigger AI Analysis
async function triggerAIAnalysis() {
  if (state.plants.length === 0) {
    alert("Füge bitte zuerst mindestens eine Pflanze hinzu, um die Analyse zu starten.");
    return;
  }

  // Show loading indicator
  elLoadingText.textContent = `Hole Wetterdaten für ${state.balcony.city}...`;
  elLoadingOverlay.classList.add("show");

  const requestBody = {
    balconyConfig: state.balcony,
    plants: state.plants.map(p => ({
      id: p.id,
      name: p.name,
      species: p.species,
      lastWatered: p.lastWatered,
      sunHours: p.sunHours,
      imageUrl: p.imageUrl,
      description: p.description
    }))
  };

  // Determine API base url (support local FastAPI port or relative in container)
  const apiBase = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "";

  try {
    elLoadingText.textContent = "KI Agenten bewerten Bodenfeuchtigkeit & Wasserbedarf...";
    
    const response = await fetch(`${apiBase}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Serverfehler während der Analyse.");
    }

    const data = await response.json();
    
    if (data.success && data.analyses) {
      // Merge results back into plants state
      data.analyses.forEach(result => {
        const plantIndex = state.plants.findIndex(p => p.id === result.plant_id);
        if (plantIndex !== -1) {
          state.plants[plantIndex].moisture_level = result.moisture_level;
          state.plants[plantIndex].status = result.status;
          state.plants[plantIndex].next_watering_date = result.next_watering_date;
          state.plants[plantIndex].explanation = result.explanation;
        }
      });
      
      saveState();
      renderPlants();
    } else {
      throw new Error("Ungültiges Analyse-Ergebnis erhalten.");
    }

  } catch (error) {
    console.error("Analysis Error:", error);
    alert(`Fehler bei der KI-Analyse: ${error.message}\n\nStelle sicher, dass der FastAPI Server läuft (Port 8000) und der GEMINI_API_KEY gesetzt ist.`);
  } finally {
    elLoadingOverlay.classList.remove("show");
  }
}

// Backup Functions
btnBackupExport.addEventListener("click", () => {
  const backupData = JSON.stringify(state, null, 2);
  const blob = new Blob([backupData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `floracast_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

btnBackupImport.addEventListener("click", () => {
  backupFileInput.click();
});

backupFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedState = JSON.parse(event.target.result);
      if (importedState.balcony && Array.isArray(importedState.plants)) {
        state = importedState;
        saveState();
        updateBalconyUI();
        renderPlants();
        alert("Backup erfolgreich importiert!");
      } else {
        throw new Error("Datenstruktur ist ungültig.");
      }
    } catch (err) {
      alert("Fehler beim Laden des Backups: " + err.message);
    }
  };
  reader.readAsText(file);
});

// Event Bindings
btnEditBalcony.addEventListener("click", openBalconyModal);
btnAddPlant.addEventListener("click", openAddPlantModal);
btnAnalyze.addEventListener("click", triggerAIAnalysis);

// Initialization
function init() {
  loadState();
  updateBalconyUI();
  renderPlants();
}

window.addEventListener("DOMContentLoaded", init);
