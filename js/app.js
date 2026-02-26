// API KEY
const API_KEY = 'e4736aaca65a8effda4247be812e3cad'; // <-- Replace this with your actual API key

/* Base URLs for OpenWeatherMap endpoints */
const BASE_WEATHER  = 'https://api.openweathermap.org/data/2.5/weather';
const BASE_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
const ICON_URL      = 'https://openweathermap.org/img/wn/';


/* ----------------------------------------------------
   GLOBAL STATE
   ---------------------------------------------------- */
let currentUnit   = 'C';   // Temperature unit: 'C' or 'F'
let rawTempC      = null;  // Stored raw celsius temp (for toggling unit)
let rawFeelsLikeC = null;  // Stored raw feels-like temp in celsius


/* ----------------------------------------------------
   DOM REFERENCES
   ---------------------------------------------------- */
const cityInput       = document.getElementById('cityInput');
const clearBtn        = document.getElementById('clearBtn');
const searchBtn       = document.getElementById('searchBtn');
const locationBtn     = document.getElementById('locationBtn');
const recentDropdown  = document.getElementById('recentDropdown');
const recentList      = document.getElementById('recentList');
const errorBanner     = document.getElementById('errorBanner');
const errorTitle      = document.getElementById('errorTitle');
const errorMsg        = document.getElementById('errorMsg');
const closeErrorBtn   = document.getElementById('closeErrorBtn');
const heatAlert       = document.getElementById('heatAlert');
const closeAlertBtn   = document.getElementById('closeAlertBtn');
const loadingSpinner  = document.getElementById('loadingSpinner');
const weatherDisplay  = document.getElementById('weatherDisplay');
const emptyState      = document.getElementById('emptyState');
const rainOverlay     = document.getElementById('rainOverlay');
const appBody         = document.getElementById('appBody');


/* ====================================================
   SECTION 1: DATE & TIME
   ==================================================== */

/* Show today's date in the header */
function showHeaderDate() {
  const el = document.getElementById('headerDate');
  if (!el) return;
  const now = new Date();
  /* Format: Monday, 1 January 2024 */
  el.textContent = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/* Run on load */
showHeaderDate();


/* ====================================================
   SECTION 2: RECENT CITIES
   ==================================================== */

/* Read saved cities array from localStorage */
function getRecentCities() {
  try {
    return JSON.parse(localStorage.getItem('skyPulseRecent')) || [];
  } catch {
    return []; // If localStorage fails, return empty
  }
}

/* Add a new city to the front of the saved list */
/* Saves up to 8 recent cities in localStorage */
function saveCity(cityName) {
  let cities = getRecentCities();

  /* Remove duplicate (case-insensitive) */
  cities = cities.filter(c => c.toLowerCase() !== cityName.toLowerCase());

  /* Add to front */
  cities.unshift(cityName);

  /* Keep only 8 most recent */
  cities = cities.slice(0, 8);

  localStorage.setItem('skyPulseRecent', JSON.stringify(cities));
}

/* Build and show the recent cities dropdown list */
function showRecentDropdown() {
  const cities = getRecentCities();

  /* If no cities saved, keep dropdown hidden */
  if (cities.length === 0) {
    recentDropdown.classList.add('hidden');
    return;
  }

  /* Clear existing list items */
  recentList.innerHTML = '';

  /* Create a list item for each saved city */
  cities.forEach(city => {
    const li  = document.createElement('li');
    const btn = document.createElement('button');

    btn.className = 'w-full text-left px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-50 flex items-center gap-2';
    btn.innerHTML = `<span>🕐</span> ${city}`;

    /* Clicking a recent city searches it immediately */
    btn.addEventListener('click', () => {
      cityInput.value = city;
      recentDropdown.classList.add('hidden');
      fetchByCity(city);
    });

    li.appendChild(btn);
    recentList.appendChild(li);
  });

  /* Show the dropdown */
  recentDropdown.classList.remove('hidden');
}

/* Show dropdown when user clicks on the input */
cityInput.addEventListener('focus', () => {
  showRecentDropdown();
});

/* Hide dropdown when clicking anywhere outside */
document.addEventListener('click', (e) => {
  const isInsideInput    = cityInput.contains(e.target);
  const isInsideDropdown = recentDropdown.contains(e.target);
  if (!isInsideInput && !isInsideDropdown) {
    recentDropdown.classList.add('hidden');
  }
});

/* Show/hide the clear (✕) button based on input content */
cityInput.addEventListener('input', () => {
  /* Show X button only when input has text */
  clearBtn.classList.toggle('hidden', cityInput.value.length === 0);

  /* Hide dropdown while user is typing */
  if (cityInput.value.length > 0) {
    recentDropdown.classList.add('hidden');
  }
});

/* Clear input when X is clicked */
clearBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearBtn.classList.add('hidden');
  cityInput.focus();
  showRecentDropdown();
});


/* ====================================================
   SECTION 3: ERROR & ALERT HANDLING
   ==================================================== */

/* Show the error banner with a title and message */
function showError(title, message) {
  errorTitle.textContent = title;
  errorMsg.textContent   = message;
  errorBanner.classList.remove('hidden');

  /* Auto-hide after 7 seconds */
  setTimeout(hideError, 7000);
}

/* Hide the error banner */
function hideError() {
  errorBanner.classList.add('hidden');
}

/* Close button hides the error banner */
closeErrorBtn.addEventListener('click', hideError);

/* Show heat warning if temp is above 40°C */
function checkHeatAlert(tempCelsius) {
  if (tempCelsius > 40) {
    heatAlert.classList.remove('hidden');
  } else {
    heatAlert.classList.add('hidden');
  }
}

/* Close button hides the heat alert */
closeAlertBtn.addEventListener('click', () => {
  heatAlert.classList.add('hidden');
});


/* ====================================================
   SECTION 4: LOADING STATE
   ==================================================== */

/* Show or hide the loading spinner */
function setLoading(isLoading) {
  if (isLoading) {
    /* Show spinner */
    loadingSpinner.classList.remove('hidden');
    loadingSpinner.classList.add('flex');

    /* Hide other sections while loading */
    weatherDisplay.classList.add('hidden');
    emptyState.classList.add('hidden');
    hideError();
  } else {
    /* Hide spinner */
    loadingSpinner.classList.add('hidden');
    loadingSpinner.classList.remove('flex');
  }
}


/* ====================================================
   SECTION 5: INPUT VALIDATION
   ==================================================== */
/* Validates city name before making API call */

function validateInput(city) {
  /* Empty input check */
  if (city === '') {
    showError('Empty Search', 'Please type a city name before searching.');
    return false;
  }

  /* City names only contain letters, spaces, hyphens, apostrophes */
  if (!/^[a-zA-Z\s\-'\.]+$/.test(city)) {
    showError('Invalid City Name', 'Please enter a valid city name (letters only, no numbers or symbols).');
    return false;
  }

  return true; /* Validation passed */
}


/* ====================================================
   SECTION 6: SEARCH TRIGGERS
   ==================================================== */

/* Search button click */
searchBtn.addEventListener('click', () => {
  recentDropdown.classList.add('hidden');
  const city = cityInput.value.trim();
  if (validateInput(city)) {
    fetchByCity(city);
  }
});

/* Pressing Enter key in the input also triggers search */
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    recentDropdown.classList.add('hidden');
    const city = cityInput.value.trim();
    if (validateInput(city)) {
      fetchByCity(city);
    }
  }
});

/* Location button — uses the browser's Geolocation API */
locationBtn.addEventListener('click', () => {
  /* Check if browser supports geolocation */
  if (!navigator.geolocation) {
    showError('Not Supported', 'Your browser does not support location detection.');
    return;
  }

  setLoading(true);

  /* Request current position from browser */
  navigator.geolocation.getCurrentPosition(
    /* Success: got coordinates */
    (position) => {
      fetchByCoords(position.coords.latitude, position.coords.longitude);
    },
    /* Failure: user denied or error */
    () => {
      setLoading(false);
      showError('Location Denied', 'Please allow location access in your browser settings and try again.');
    }
  );
});


/* ====================================================
   SECTION 7: HELPER FUNCTIONS
   ==================================================== */

/* Convert Celsius to Fahrenheit */
function toFahrenheit(c) {
  return ((c * 9) / 5 + 32).toFixed(1);
}

/* Format a date string like "2024-04-24" into "Wed, 24 Apr" */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

/* Format a unix timestamp into full date string */
function formatFullDate(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/* Build the icon image URL from OpenWeatherMap's icon code */
function getIconURL(iconCode) {
  return `${ICON_URL}${iconCode}@2x.png`;
}

/* Return a weather emoji based on condition text (used as fallback) */
function getEmoji(condition) {
  const c = condition.toLowerCase();
  if (c.includes('clear'))        return '☀️';
  if (c.includes('cloud'))        return '⛅';
  if (c.includes('rain'))         return '🌧️';
  if (c.includes('drizzle'))      return '🌦️';
  if (c.includes('thunderstorm')) return '⛈️';
  if (c.includes('snow'))         return '❄️';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
  return '🌤️';
}

/* Short day name from a date string — e.g. "MO", "TU" like the reference image */
function getShortDay(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase().slice(0, 2);
}

/* Apply or remove the rainy dark theme on the body */
/* Changes background to dark rainy theme */
/* Also shows animated rain overlay on screen */
function applyRainyTheme(condition) {
  const c = condition.toLowerCase();
  const isRainy = c.includes('rain') || c.includes('drizzle') || c.includes('thunder');

  if (isRainy) {
    appBody.classList.add('rainy');
    rainOverlay.classList.remove('hidden'); /* Show animated rain lines */
  } else {
    appBody.classList.remove('rainy');
    rainOverlay.classList.add('hidden');   /* Hide rain overlay */
  }
}


/* ====================================================
   SECTION 8: RENDER FUNCTIONS
   ==================================================== */

/* --- Render today's main weather card --- */
function renderToday(data) {
  /* Extract the values we need from the API response */
  const cityCountry = data.name + (data.sys?.country ? `, ${data.sys.country}` : '');
  const tempC       = data.main.temp;
  const feelsLikeC  = data.main.feels_like;
  const humidity    = data.main.humidity;
  const windMs      = data.wind.speed;
  const visibilityM = data.visibility;
  const condition   = data.weather[0].description;
  const iconCode    = data.weather[0].icon;
  const timestamp   = data.dt;

  /* Save raw celsius values so we can convert when unit is toggled */
  rawTempC      = tempC;
  rawFeelsLikeC = feelsLikeC;

  /* Fill in the city name and date */
  document.getElementById('cityName').textContent  = cityCountry;
  document.getElementById('todayDate').textContent = formatFullDate(timestamp);

  /* Fill in the weather description and icon */
  document.getElementById('weatherDesc').textContent = condition;
  document.getElementById('weatherIcon').src          = getIconURL(iconCode);
  document.getElementById('weatherIcon').alt          = condition;

  /* Fill in the stat cards */
  document.getElementById('humidity').textContent   = `${humidity}%`;
  document.getElementById('windSpeed').textContent  = `${(windMs * 3.6).toFixed(1)} km/h`;
  document.getElementById('visibility').textContent = `${(visibilityM / 1000).toFixed(1)} km`;

  /* Show temperature using the currently selected unit */
  updateTemperatureDisplay();

  /* Apply rainy background if needed */
  applyRainyTheme(condition);

  /* Show heat alert if temperature exceeds 40°C */
  checkHeatAlert(tempC);
}

/* Update temperature text whenever the unit toggle changes */
function updateTemperatureDisplay() {
  if (rawTempC === null) return;

  const tempEl      = document.getElementById('tempValue');
  const feelsLikeEl = document.getElementById('feelsLike');

  if (currentUnit === 'F') {
    tempEl.textContent      = toFahrenheit(rawTempC);
    feelsLikeEl.textContent = `${toFahrenheit(rawFeelsLikeC)}°F`;
  } else {
    tempEl.textContent      = rawTempC.toFixed(1);
    feelsLikeEl.textContent = `${rawFeelsLikeC.toFixed(1)}°C`;
  }
}

/* Called when user clicks °C or °F */
/* Toggles temperature between Celsius and Fahrenheit */
function setUnit(unit) {
  currentUnit = unit;

  /* Toggle the active class on the buttons */
  document.getElementById('btnC').className = `unit-btn ${unit === 'C' ? 'active' : ''}`;
  document.getElementById('btnF').className = `unit-btn ${unit === 'F' ? 'active' : ''}`;

  /* Re-render temperature values */
  updateTemperatureDisplay();
}

/* Make setUnit available globally (called by onclick in HTML) */
window.setUnit = setUnit;


/* --- Render the side pill cards (like reference image left column) --- */
/* These show each day as a compact rounded pill */
function renderDayPills(forecastData) {
  const container = document.getElementById('dayPillsContainer');
  container.innerHTML = '';

  /* Get the daily map (one entry per day) */
  const dailyMap = getDailyMap(forecastData.list);
  const today    = new Date().toISOString().split('T')[0];

  /* Get up to 5 future days */
  const days = Object.keys(dailyMap).filter(d => d !== today).slice(0, 5);

  days.forEach((date, i) => {
    const item      = dailyMap[date];
    const tempC     = item.main.temp;
    const condition = item.weather[0].description;
    const iconCode  = item.weather[0].icon;
    const shortDay  = getShortDay(date); /* e.g. "MO", "TU" */

    /* Temp to show based on unit */
    const displayTemp = currentUnit === 'F'
      ? `${toFahrenheit(tempC)}°F`
      : `+${tempC.toFixed(0)}°`;

    /* Create the pill card div */
    const pill = document.createElement('div');
    pill.className = 'bg-white rounded-xl2 px-4 py-3 flex items-center justify-between animate-fade-up';
    pill.style.animationDelay = `${i * 0.06}s`;
    pill.style.boxShadow = '0 4px 16px rgba(74,144,217,0.12)';

    pill.innerHTML = `
      <div>
        <p class="text-xs font-black text-sky-400">${shortDay}</p>
        <p class="text-lg font-black text-sky-700">${displayTemp}</p>
      </div>
      <img
        src="${getIconURL(iconCode)}"
        alt="${condition}"
        class="w-10 h-10"
        onerror="this.style.display='none'"
      />
    `;

    container.appendChild(pill);
  });
}


/* --- Render the 5-day detailed forecast grid cards --- */
function renderForecastGrid(forecastData) {
  const grid = document.getElementById('forecastGrid');
  grid.innerHTML = '';

  /* Get daily map */
  const dailyMap = getDailyMap(forecastData.list);
  const today    = new Date().toISOString().split('T')[0];

  /* Next 5 days only */
  const days = Object.keys(dailyMap).filter(d => d !== today).slice(0, 5);

  if (days.length === 0) {
    grid.innerHTML = '<p class="text-sky-400 text-sm font-bold col-span-full">Forecast unavailable.</p>';
    return;
  }

  days.forEach((date, i) => {
    const item      = dailyMap[date];
    const tempC     = item.main.temp;
    const humidity  = item.main.humidity;
    const windMs    = item.wind.speed;
    const condition = item.weather[0].description;
    const iconCode  = item.weather[0].icon;
    const emoji     = getEmoji(condition);

    /* Build the card */
    const card = document.createElement('div');
    /* Add stagger animation delay class */
    const delayClass = ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5'][i] || '';
    card.className = `forecast-card animate-fade-up ${delayClass}`;

    card.innerHTML = `
      <!-- Date label -->
      <p class="text-xs font-black text-sky-400 uppercase tracking-wide">${formatDate(date)}</p>

      <!-- Weather icon (OWM image, emoji fallback) -->
      <img
        src="${getIconURL(iconCode)}"
        alt="${condition}"
        class="w-12 h-12"
        onerror="this.outerHTML='<span class=\\"text-3xl\\">${emoji}</span>'"
      />

      <!-- Temperature -->
      <p class="text-xl font-black text-sky-700">${tempC.toFixed(0)}°C</p>

      <!-- Wind speed with icon -->
      <div class="flex items-center gap-1 text-xs font-bold text-sky-500">
        <span>🌬️</span>
        <span>${(windMs * 3.6).toFixed(1)} km/h</span>
      </div>

      <!-- Humidity with icon -->
      <div class="flex items-center gap-1 text-xs font-bold text-sky-400">
        <span>💧</span>
        <span>${humidity}%</span>
      </div>
    `;

    grid.appendChild(card);
  });
}


/* ====================================================
   SECTION 9: DATA PROCESSING HELPER
   ==================================================== */

function getDailyMap(forecastList) {
  const dailyMap = {};

  forecastList.forEach(item => {
    /* The date part of "2024-04-24 12:00:00" */
    const date = item.dt_txt.split(' ')[0];
    const hour = parseInt(item.dt_txt.split(' ')[1]);

    /* For each date, keep the noon-ish reading (closest to 12:00) */
    if (!dailyMap[date]) {
      dailyMap[date] = item;
    } else {
      const existingHour = parseInt(dailyMap[date].dt_txt.split(' ')[1]);
      if (Math.abs(hour - 12) < Math.abs(existingHour - 12)) {
        dailyMap[date] = item;
      }
    }
  });

  return dailyMap;
}


/* ====================================================
   SECTION 10: API FETCH FUNCTIONS
   ==================================================== */

/* --- Fetch weather by city name --- */
async function fetchByCity(city) {
  setLoading(true);

  try {
    /* --- Fetch current weather --- */
    const weatherRes = await fetch(
      `${BASE_WEATHER}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );

    /* Handle HTTP error codes */
    if (!weatherRes.ok) {
      if (weatherRes.status === 404) {
        throw new Error(`"${city}" not found. Check spelling and try again.`);
      }
      if (weatherRes.status === 401) {
        throw new Error('Invalid API key. Please add your OpenWeatherMap key in js/app.js.');
      }
      throw new Error(`Server error (${weatherRes.status}). Please try again.`);
    }

    const weatherData = await weatherRes.json();

    /* --- Fetch 5-day forecast --- */
    const forecastRes = await fetch(
      `${BASE_FORECAST}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );

    if (!forecastRes.ok) {
      throw new Error(`Could not load forecast. Please try again.`);
    }

    const forecastData = await forecastRes.json();

    /* Save this city to recent searches */
    saveCity(weatherData.name);

    /* Render everything on screen */
    renderToday(weatherData);
    renderDayPills(forecastData);
    renderForecastGrid(forecastData);

    /* Show the weather section, hide loading and empty state */
    setLoading(false);
    weatherDisplay.classList.remove('hidden');
    emptyState.classList.add('hidden');

  } catch (err) {
    /* Show the error in the UI banner */
    setLoading(false);
    showError('Could Not Load Weather', err.message || 'Something went wrong. Check your connection.');
    emptyState.classList.remove('hidden');
  }
}


/* --- Fetch weather by GPS coordinates (current location) --- */
async function fetchByCoords(lat, lon) {
  setLoading(true);

  try {
    const weatherRes = await fetch(
      `${BASE_WEATHER}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!weatherRes.ok) {
      if (weatherRes.status === 401) {
        throw new Error('Invalid API key. Please add your OpenWeatherMap key in js/app.js.');
      }
      throw new Error(`Server error (${weatherRes.status}). Please try again.`);
    }

    const weatherData = await weatherRes.json();

    const forecastRes = await fetch(
      `${BASE_FORECAST}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    if (!forecastRes.ok) {
      throw new Error(`Could not load forecast. Please try again.`);
    }

    const forecastData = await forecastRes.json();

    /* Auto-fill the input with detected city name */
    cityInput.value = weatherData.name;

    /* Save to recent searches */
    saveCity(weatherData.name);

    /* Render */
    renderToday(weatherData);
    renderDayPills(forecastData);
    renderForecastGrid(forecastData);

    setLoading(false);
    weatherDisplay.classList.remove('hidden');
    emptyState.classList.add('hidden');

  } catch (err) {
    setLoading(false);
    showError('Location Error', err.message || 'Could not get weather for your location.');
    emptyState.classList.remove('hidden');
  }
}


/* ====================================================
   SECTION 11: INIT — runs when page first loads
   ==================================================== */
(function init() {
  /* Pre-load the recent dropdown so it's ready on focus */
  showRecentDropdown();
  recentDropdown.classList.add('hidden'); /* Keep hidden until focus */
})();
