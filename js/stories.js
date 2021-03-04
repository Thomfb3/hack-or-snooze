"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;


/** Get and show stories when site first loads. */
async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */
function generateStoryMarkup(story) {
  console.debug("generateStoryMarkup");

  //return markup
  return $(`
    <li id="${story.storyId}">
      ${getFavoriteIcon(story)}
      <a href="${story.url}" target="a_blank" class="story-link">
      ${story.title}
      </a>
      <small class="story-hostname">(${story.getHostName()})</small>
      <small class="story-author">by ${story.author}</small>
      ${getEditAndDeleteBtn(story)}
      <small class="story-user">posted by ${story.username}</small>
    </li>
  `);
}


//creates the markup for the edit and delete button
function getEditAndDeleteBtn(story) {
  // Determine if story is in ownStories, if so return edit and delete buttons
  if (currentUser && currentUser.isOwnStory(story)) {
    return `
      <small class="story-mine edit-story">edit my story <i class="fas fa-pencil-alt"></i></small>
      <small class="story-delete">delete my story <i class="delete fas fa-trash-alt"></i></small>
    `;
  } else {
    return "";
  }
}


//creates the markup for the favorite icon
function getFavoriteIcon(story) {
  //if user is logged in, determine if story is favorite
  if (currentUser) {
    const isFavorite = currentUser.isFavorite(story) ? "fas" : "far";
    return `
      <i data-story-id="${story.storyId}" class="favorite ${isFavorite} fa-star"></i>
    `;
  } else {
    return "";
  }
}


/** Gets list of stories from server, generates their HTML, and puts on page. */
function putStoriesOnPage() {
  console.debug("putStoriesOnPage");
  //Clear stories list
  $allStoriesList.empty();
  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }
  //Show new list
  $allStoriesList.show();
}


/** Creates the markup for the user's favorites a */
function putMyStoriesOnPage() {
  console.debug("putMyStoriesOnPage");
  //Clear stories list
  $allStoriesList.empty();

  if (currentUser.ownStories.length < 1) {
    $allStoriesList.text("No Stories of your own yet.");
  }
  // loop through all of our stories and generate HTML for them
  for (let story of currentUser.ownStories) {
    //create markup for each story
    const $story = generateStoryMarkup(story);
    //Append each story to storylist
    $allStoriesList.append($story);
  }
  //Show new list
  $allStoriesList.show();
}


/** Creates the markup for the user's favorites a */
function putFavoritesOnPage() {
  console.debug("putFavoritesOnPage");
  //Clear stories list
  $allStoriesList.empty();

  if (currentUser.favorites.length < 1) {
    $allStoriesList.text("No Favorites yet.");
  }
  // loop through all of our stories and generate HTML for them
  for (let story of currentUser.favorites) {
    //create markup for each story
    const $story = generateStoryMarkup(story);
    //Append each story to storylist
    $allStoriesList.append($story);
  }
  //Show new list
  $allStoriesList.show();
}


/** submit new story to server, and update story list on page */
async function submitNewStory(evt) {
  console.debug("submitNewStory", evt);
  evt.preventDefault();
  //Get values from form input 
  const title = $("#story-title").val();
  const author = $("#story-author").val();
  const url = $("#story-url").val();
  //Set story data from form input values
  const storyData = { title, author, url };
  //create story with addStory function
  const story = await storyList.addStory(currentUser, storyData);
  //create the story markup
  const $storyMarkup = generateStoryMarkup(story);
  //add new story markup to the story list
  $allStoriesList.prepend($storyMarkup);

  //reset ui
  hidePageComponents();
  putStoriesOnPage();
}
/** event listener on submit story form */
$submitStoryForm.on("submit", submitNewStory);



/** When the user clicks Edit a story */
function openEditStoryForm(evt) {
  console.debug("openEditStoryForm", evt);
  //Check for the class name edit-story
  if (evt.target.classList.contains("edit-story")) {
    //capture the story id
    const storyId = evt.target.parentElement.id;
    //collect the story based on the story id
    const story = storyList.stories.find(s => s.storyId === storyId);

    //Set input values based on the current story data
    $("#edit-title").val(story.title);
    $("#edit-author").val(story.author);
    $("#edit-url").val(story.url);
    //Set data attribute of form with storyId
    $editStoryForm.attr("data-story-id", storyId);
    //Hide other components
    hidePageComponents();
    //Show edit form;
    $editStoryForm.show();
  }
}
/** event listener on allStoriesList */
$allStoriesList.on("click", openEditStoryForm)



/** submit story edits to server, and update story list on page */
async function submitEditStory(evt) {
  console.debug("submitEditStory", evt);
  evt.preventDefault();
  //Get storyId
  const storyId = $(evt.target).attr("data-story-id");
  const storyToBeEdited = storyList.stories.find(story => story.storyId === storyId);

  //Get values from form input 
  const title = $("#edit-title").val();
  const author = $("#edit-author").val();
  const url = $("#edit-url").val();
  //Set story data from form input values
  const newStoryData = { title, author, url };
  // console.log(currentUser, storyToBeEdited, newStoryData)
  //create story with addStory function
  await storyList.editStory(currentUser, storyToBeEdited, newStoryData);

  //reset ui
  //Hide edit form;
  $editStoryForm.hide();
  //Show stories again, the updated story moves to the top of the list
  putStoriesOnPage();
}
/** event listener on submit story form */
$editStoryForm.on("submit", submitEditStory);



/** add favorite on icon click */
async function toggleFavoriteStory(evt) {
  console.debug("toggleFavoriteStory");
  //only do something if the element has the class favorite
  if (evt.target.classList.contains("favorite")) {

    //get the story id from the star icon's data-story-id
    const storyId = $(evt.target).attr("data-story-id");
    //Find the story with the element's story id
    const clickedStory = storyList.stories.find(story => story.storyId === storyId)

    if (currentUser.isFavorite(clickedStory)) {
      // switch icon classes
      $(evt.target).addClass("far");
      $(evt.target).removeClass("fas");
      //Run removeFavorites 
      currentUser.removeFavorites(clickedStory);
    } else {
      // switch icon classes
      $(evt.target).addClass("fas");
      $(evt.target).removeClass("far");
      //Run addFavorites 
      currentUser.addFavorites(clickedStory);
    }
  }
}
/** event listener on allStoriesList */
$allStoriesList.on("click", toggleFavoriteStory)


/** Delete a story */
async function deleteStory(evt) {
  console.debug("deleteStory");
  //Check for story delete class
  if (evt.target.classList.contains("story-delete")) {
    //save the story id via the parentElement ID
    const storyId = evt.target.parentElement.id;
    //run deleteStory from the storyList object
    await storyList.deleteStory(currentUser, storyId);
    //reset ui
    $allStoriesList.empty();
    putStoriesOnPage();
  }
}
/** event listener for deleteStory */
$allStoriesList.on("click", deleteStory);

