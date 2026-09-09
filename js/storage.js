/**
 * storage.js
 * -----------------------------------------------------------------------
 * IronLog data storage layer.
 *
 * Responsibilities:
 * - Maintain the local application cache
 * - Save a local copy in localStorage
 * - Load data from the Flask/PostgreSQL backend
 * - Sync changes to the backend
 * - Provide a simple Storage API for the rest of the app
 * -----------------------------------------------------------------------
 */

const Storage = (() => {

  /* ---------------------------------------------------------------------
   * Configuration
   * ------------------------------------------------------------------- */

  const KEY = 'ironlog_data_v1';

  const API_BASE = window.IRONLOG_CONFIG.API_BASE.replace(/\/$/, '');


  /* ---------------------------------------------------------------------
   * Default data
   * ------------------------------------------------------------------- */

  function defaultData() {

    return {
      profile: {
        name: '',
        age: '',
        height: '',
        weight: '',
        goal: ''
      },

      settings: {
        theme: 'dark',
        weightUnit: 'kg',
        heightUnit: 'cm',
        reminderEnabled: false,
        reminderTime: '18:00'
      },

      customExercises: [],

      workouts: [],

      activeWorkout: null,

      measurements: [],

      personalRecords: {}
    };
  }


  /* ---------------------------------------------------------------------
   * Load data from localStorage
   * ------------------------------------------------------------------- */

  function load() {

    try {

      const raw = localStorage.getItem(KEY);

      if (!raw) {
        return defaultData();
      }

      const parsed = JSON.parse(raw);

      /*
       * Merge with default data so newly added properties don't disappear
       * when an older localStorage version is loaded.
       */
      return {
        ...defaultData(),
        ...parsed
      };

    } catch (error) {

      console.error(
        'IronLog local storage load failed:',
        error
      );

      return defaultData();
    }
  }


  /* ---------------------------------------------------------------------
   * Save data locally
   * ------------------------------------------------------------------- */

  function saveLocal(data) {

    try {

      localStorage.setItem(
        KEY,
        JSON.stringify(data)
      );

      return true;

    } catch (error) {

      console.error(
        'IronLog local storage save failed:',
        error
      );

      return false;
    }
  }


  /* ---------------------------------------------------------------------
   * Local cache
   * ------------------------------------------------------------------- */

  let cache = load();


  /* ---------------------------------------------------------------------
   * Load data from PostgreSQL
   * ------------------------------------------------------------------- */

  async function hydrate() {

    try {

      const response = await fetch(
        `${API_BASE}/api/data`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );


      /* ---------------------------------------------------------------
       * 401 = user is not logged in.
       * This is the ONLY response that should trigger a login redirect.
       * --------------------------------------------------------------- */

      if (response.status === 401) {

        console.log(
          'IronLog: user is not logged in.'
        );

        return {
          success: false,
          loggedOut: true
        };
      }


      /* ---------------------------------------------------------------
       * Any other HTTP error means the backend/database has a problem.
       * Do NOT treat this as a logout.
       * --------------------------------------------------------------- */

      if (!response.ok) {

        console.error(
          `IronLog backend returned HTTP ${response.status}`
        );

        return {
          success: false,
          loggedOut: false
        };
      }


      /* ---------------------------------------------------------------
       * Parse server response
       * --------------------------------------------------------------- */

      let serverData;

      try {

        serverData = await response.json();

      } catch (error) {

        console.error(
          'IronLog received invalid JSON from the backend:',
          error
        );

        return {
          success: false,
          loggedOut: false
        };
      }


      /* ---------------------------------------------------------------
       * Update local cache
       * --------------------------------------------------------------- */

      cache = {
        ...defaultData(),
        ...serverData
      };


      /* ---------------------------------------------------------------
       * Keep a local copy as a cache/fallback.
       * --------------------------------------------------------------- */

      saveLocal(cache);


      console.log(
        'IronLog data loaded from PostgreSQL ✅'
      );


      return {
        success: true,
        loggedOut: false
      };

    } catch (error) {

      /*
       * Network error, server offline, CORS issue, etc.
       *
       * IMPORTANT:
       * Do not redirect to login here.
       */
      console.error(
        'Could not connect to IronLog backend:',
        error
      );

      return {
        success: false,
        loggedOut: false
      };
    }
  }


  /* ---------------------------------------------------------------------
   * Sync data to PostgreSQL
   * ------------------------------------------------------------------- */

  async function syncToServer() {

    try {

      const response = await fetch(
        `${API_BASE}/api/data`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json'
          },

          credentials: 'include',

          body: JSON.stringify(cache)
        }
      );


      /* ---------------------------------------------------------------
       * Handle failed request
       * --------------------------------------------------------------- */

      if (!response.ok) {

        console.error(
          `Failed to save IronLog data to server. HTTP ${response.status}`
        );

        return false;
      }


      console.log(
        'IronLog data saved to PostgreSQL ✅'
      );


      return true;

    } catch (error) {

      console.error(
        'Could not connect to backend while saving:',
        error
      );

      return false;
    }
  }


  /* ---------------------------------------------------------------------
   * Public Storage API
   * ------------------------------------------------------------------- */

  return {

    /* ---------------------------------------------------------------
     * Get current cached data
     * --------------------------------------------------------------- */

    get() {

      return cache;
    },


    /* ---------------------------------------------------------------
     * Update part of the data
     * --------------------------------------------------------------- */

    update(partial) {

      cache = {
        ...cache,
        ...partial
      };


      /*
       * Save immediately to localStorage.
       */
      saveLocal(cache);


      /*
       * Sync with PostgreSQL.
       *
       * We intentionally don't await this here because most existing
       * IronLog UI code expects update() to remain synchronous.
       */
      syncToServer().catch(error => {

        console.error(
          'IronLog background sync failed:',
          error
        );
      });


      return cache;
    },


    /* ---------------------------------------------------------------
     * Replace all data
     * --------------------------------------------------------------- */

    replaceAll(newData) {

      cache = {
        ...defaultData(),
        ...newData
      };


      saveLocal(cache);


      /*
       * Keep PostgreSQL in sync after replacing all data.
       */
      syncToServer().catch(error => {

        console.error(
          'IronLog full data sync failed:',
          error
        );
      });


      return cache;
    },


    /* ---------------------------------------------------------------
     * Reset all data
     * --------------------------------------------------------------- */

    resetAll() {

      cache = defaultData();

      saveLocal(cache);


      /*
       * Also reset the server-side data.
       */
      syncToServer().catch(error => {

        console.error(
          'IronLog reset sync failed:',
          error
        );
      });


      return cache;
    },


    /* ---------------------------------------------------------------
     * Export data as JSON
     * --------------------------------------------------------------- */

    exportJSON() {

      return JSON.stringify(
        cache,
        null,
        2
      );
    },


    /* ---------------------------------------------------------------
     * Load server data
     * --------------------------------------------------------------- */

    hydrate,


    /* ---------------------------------------------------------------
     * Generate unique IDs
     * --------------------------------------------------------------- */

    uid(prefix = 'id') {

      return `${prefix}_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    }

  };

})();
