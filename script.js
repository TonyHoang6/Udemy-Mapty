'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}



///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const buttonDelete = document.querySelector(`.workout__delete`);
const buttonDeleteAll = document.querySelector(`.deleteAll__btn`);
const buttonEdit = document.querySelector(`.workout__edit`);

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #isEdit = false;
  #oldWorkout;
  #markers = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    form.addEventListener('submit', this._editWorkout.bind(this));
    buttonDeleteAll.addEventListener('click', this._deleteAll.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._workoutHandle.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
  

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    if (this.#isEdit) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords);
    this.#markers.push(marker);
    marker
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${Number(workout.pace).toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>

        <button class="workout__edit">Edit</button>
        <button class="workout__delete">Delete</button>

      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${Number(workout.speed).toFixed(
            1
          )}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>

        <button class="workout__edit">Edit</button>
        <button class="workout__delete">Delete</button>

      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _workoutHandle(e) {
    if (e.target.classList[0] === `workout__edit`) {
      this.#isEdit = true;
      this._edit(e);
    } else if (e.target.classList[0] === `workout__delete`) {
      this._delete(e);
    } else {
      this._moveToPopup(e);
    }
  }

  // Same as newWorkout, only edit workout, except keep current marker, e is invalid
  _editWorkout(e) {
    if (!this.#isEdit) return;
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
  

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
    }

    const workoutValues = document
      .querySelector(`[data-id="${this.#oldWorkout.id}"]`)
      .getElementsByClassName(`workout__value`);

    // Now have access to current workout values
    const workoutArray = [...workoutValues];
    const distanceVal = workoutArray[0];
    const durationVal = workoutArray[1];
    const speedVal = workoutArray[2];
    console.log(speedVal.innerHTML);
    const cadenceVal = workoutArray[3]; // Redundant
    const elevationVal = workoutArray[3];

    this.#oldWorkout.type = inputType.value;
    distanceVal.innerHTML = this.#oldWorkout.distance = +inputDistance.value;
    durationVal.innerHTML = this.#oldWorkout.duration = +inputDuration.value;

    if (type === 'running') {
      console.log(speedVal);
      speedVal.innerHTML = this.#oldWorkout.pace = Number(
        duration / distance
      ).toFixed(1);
      cadenceVal.innerHTML = this.#oldWorkout.cadence = inputCadence.value;
    }

    if (type === 'cycling') {
      speedVal.innerHTML = this.#oldWorkout.speed = Number(
        distance / (duration / 60)
      ).toFixed(1);
      elevationVal.innerHTML = this.#oldWorkout.elevationGain =
        inputElevation.value;
    }

    // Configure description
    const date = new Date(this.#oldWorkout.date);
    this.#oldWorkout.description = `${this.#oldWorkout.type[0].toUpperCase()}${this.#oldWorkout.type.slice(
      1
    )} on ${months[date.getMonth()]} ${date.getDate()}`;

    //REPLACE WORKOUT IN #WORKOUTS ARRAY
    this.#workouts[
      this.#workouts.findIndex(workout => workout.id === this.#oldWorkout.id)
    ] = this.#oldWorkout;

    // update map
    this._updateMap();

    // update sidebar list
    this._resetList();

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Clean up
    this.#isEdit = false;
    this.#oldWorkout = null;
  }

  _resetList() {
    // Delete everything
    Array.from(document.getElementsByClassName(`workout`)).forEach(work =>
      work.remove()
    );

    // Redraw list items
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _updateMap() {
    // Update markers
    // Clear map
    for (let i = 0; i < this.#markers.length; i++) {
      this.#map.removeLayer(this.#markers[i]);
    }
    // Redraw makers
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Rename to setup edit?
  _edit(e) {
    // this.#workouts.push(workout);
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    console.log(workoutEl);
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this._showForm();

    // Prefill edit inputs using previous workout
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;

    if (workout.type !== `running`) {
      if (inputType.value === `running`) {
        this._toggleElevationField();
      }

      inputElevation.value = workout.elevationGain;
      inputCadence.value = '';
    }

    if (workout.type !== `cycling`) {
      if (inputType.value === `cycling`) {
        this._toggleElevationField();
      }

      inputCadence.value = workout.cadence;
      inputElevation.value = '';
    }

    inputType.value = workout.type;

    console.log(workout);

    // Save oldWorkout, probably not the best way
    this.#oldWorkout = workout;
  }

  _delete(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (!workoutEl) return;

    this.#workouts.splice(
      this.#workouts.findIndex(work => work.id === workout.id),
      1
    );
    this._resetList();
    this._updateMap();
    this._setLocalStorage();
  }

  _deleteAll() {
    Array.from(document.getElementsByClassName(`workout`)).forEach(work =>
      work.remove()
    );

    this.#workouts = [];
    this._updateMap();
    localStorage.removeItem('workouts');
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    workout.click();
    console.log(`CLICKED`);
  }

  _setLocalStorage() {
    console.log(this.#workouts);
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // Rebuild objects here ---------------------------------
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    data.forEach(currentStoredWorkout => {
      const type = currentStoredWorkout.type;
      const distance = currentStoredWorkout.distance;
      const duration = currentStoredWorkout.duration;
      const [lat, lng] = currentStoredWorkout.coords;
      const originalDate = currentStoredWorkout.date;
      const originalID = currentStoredWorkout.id;
      let workout;

      // // If workout running, create running object
      if (type === 'running') {
        const cadence = currentStoredWorkout.cadence;
        workout = new Running([lat, lng], distance, duration, cadence);
      }
      // // If workout cycling, create cycling object
      if (type === 'cycling') {
        const elevation = currentStoredWorkout.elevationGain;

        workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Restore original workout date and ID
      const date = new Date(originalDate);
      workout.description = `${workout.type[0].toUpperCase()}${workout.type.slice(
        1
      )} on ${months[date.getMonth()]} ${date.getDate()}`;
      workout.date = date;

      // Restore original ID
      workout.id = originalID;

      this.#workouts.push(workout);
    });

    // End of rebuilding ---------------------------------

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
