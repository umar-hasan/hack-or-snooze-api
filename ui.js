$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $editForm = $("#edit-article-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navFavs = $("#nav-fav-articles");
  const $navAllArticles = $("#nav-all-articles");
  const $navMyArticles = $("#nav-my-articles");
  const $navAddArticle = $("#nav-add-article");
  const $userProfile = $("#user-profile");
  const $navLogOut = $("#nav-logout");

  const sections = [
    $allStoriesList,
    $submitForm,
    $editForm,
    $filteredArticles,
    $loginForm,
    $createAccountForm,
    $ownStories,
    $userProfile
  ]

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  let selectedStoryId = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    await generateStories();
    setUserInfo();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    await generateStories();
    setUserInfo();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    $(".separator").hide();
    $navFavs.hide();
    $navAddArticle.hide();
    $navMyArticles.hide();
    $navAllArticles.hide();
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    await showAll();
  });

  $navAllArticles.on("click", async function() {
    console.log(currentUser.ownStories)
    await showAll();
  });

  $navMyArticles.on("click", function() {
    $filteredArticles.empty();
    generateUserStories();
    showAndHideRest($filteredArticles);
  })

  $navFavs.on("click", function() {
    $filteredArticles.empty();
    generateUserFavorites();
    showAndHideRest($filteredArticles);
  })

  $navAddArticle.on("click", function() {
    showAndHideRest($submitForm)
  })

  $navWelcome.on("click", "a", async function() {
    showAndHideRest($userProfile)
  })


  /**
   * Fills in or empties out the star icon when a user favorites a story.
   * 
   * .far.fa-star = not favorited
   * .fas.fa-star = favorited
   */

  $allStoriesList.on("click", ".far.fa-star", favoriteStory)

  $allStoriesList.on("click", ".fas.fa-star", unfavoriteStory)

  $filteredArticles.on("click", ".far.fa-star", favoriteStory)

  $filteredArticles.on("click", ".fas.fa-star", unfavoriteStory)

  /**
   * Deletes a story that a user has made.
   */

  $allStoriesList.on("click", ".fas.fa-minus-circle", removeStory)

  $filteredArticles.on("click", ".fas.fa-minus-circle", removeStory)

  /**
   * Allows a user to edit a story that they have made.
   */

  $allStoriesList.on("click", ".far.fa-edit", function() {
    selectedStoryId = $(this).closest("li").attr('id')
    showAndHideRest($editForm)
  })

  $filteredArticles.on("click", ".far.fa-edit", function() {
    selectedStoryId = $(this).closest("li").attr('id')
    showAndHideRest($editForm)
  })

  $submitForm.on("submit", async function(e) {
    e.preventDefault()
    const newStory = {
      author: $('#author').val(),
      title: $('#title').val(),
      url: $('#url').val()
    }
    $submitForm.trigger("reset")
    await storyList.addStory(currentUser, newStory)
  })

  $editForm.on("submit", async function(e) {
    e.preventDefault();
    await storyList.updateStory(currentUser, selectedStoryId, $("#edit-title").val(), $("#edit-author").val())
    selectedStoryId = null
    $editForm.trigger("reset")
  })

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      setUserInfo();
    }

    showAndHideRest($allStoriesList)

  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    console.log(storyList)

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  function generateUserStories() {
    // update our global variable
    storyList = new StoryList(currentUser.ownStories);
    // empty out that part of the page
    $allStoriesList.empty();

    console.log(storyList)

    if (storyList.stories.length > 0) {
      // loop through all of our stories and generate HTML for them
      for (let story of storyList.stories) {
        console.log(story.username)
        const result = generateStoryHTML(story);
        $filteredArticles.append(result);
      }
    }
    else {
      $filteredArticles.append($("<h6>You haven't added any stories yet.</h6>"))
    }
    
  }

  function generateUserFavorites() {
    // update our global variable
    storyList = new StoryList(currentUser.favorites);
    // empty out that part of the page
    $allStoriesList.empty();

    console.log(storyList)

    if (storyList.stories.length > 0) {
      // loop through all of our stories and generate HTML for them
      for (let story of storyList.stories) {
        const result = generateStoryHTML(story);
        $filteredArticles.append(result);
      }
    }
    else {
      $filteredArticles.append($("<h6>You haven't favorited any stories.</h6>"))
    }
    
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    let fav = ''
    let del = ''
    let edit = ''
    let ownDiv = ''
    if(currentUser) {
      fav = currentUser.isFavorite(story) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'
      if(currentUser.isOwnStory(story)) {
        edit = '<i class="far fa-edit"></i>'
        del = '<i class="fas fa-minus-circle"></i>'
        ownDiv = `<div class="user-actions">${edit}${del}</div>`
      }
    }
    
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${fav}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        ${ownDiv}
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navMyArticles.show();
    $navAddArticle.show();
    $navAllArticles.show();
    $navFavs.show();
    $("#nav-welcome a").text(`${currentUser.username}`)
    $navWelcome.show();
    $ownStories.show();
    $(".separator").show();
  }

  function setUserInfo() {
    $('#profile-name').append(`<p>${currentUser.name}</p>`)
    $('#profile-username').append(`<p>${currentUser.username}</p>`)
    $('#profile-account-date').append(`<p>${currentUser.createdAt}</p>`)
  }

  /**
   * Function to show all of the stories.
   */

  async function showAll() {
    hideElements();
    await generateStories();
    showAndHideRest($allStoriesList);
  }

  /**
   * Function to favorite a story.
   */

  async function favoriteStory() {
    if (currentUser) {
      let $storyId = $(this).closest("li").attr('id')
      await currentUser.addFavorite($storyId)
      $(this).addClass("fas")
      $(this).removeClass('far')
    }
  }

  /**
   * Function to unfavorite a story.
   */

  async function unfavoriteStory() {
    if (currentUser) {
      let $storyId = $(this).closest("li").attr('id')
      await currentUser.removeFavorite($storyId)
      $(this).addClass("far")
      $(this).removeClass('fas')
    }
  }

  /**
   * Function to remove a story that a user has made.
   */

  async function removeStory() {
    let $storyId = $(this).closest("li").attr('id')
    await currentUser.removeFavorite($storyId)
    await storyList.deleteStory(currentUser, $storyId)
    $(this).closest("li").remove()
  }

  /**
   * 
   * Shows one section within the sections array and hides the rest.
   * 
   */

  function showAndHideRest(elementShow) {
    $submitForm.trigger("reset")
    $editForm.trigger("reset")
    if (elementShow !== $filteredArticles) {
      $filteredArticles.empty();
    }
    sections.forEach(($elem) => {
      if ($elem === elementShow) {
        $elem.show();
      }
      else {
        $elem.hide()
      }
    });
    elementShow.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});


