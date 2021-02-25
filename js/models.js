"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    // UNIMPLEMENTED: complete this function!
    return "hostname.com";
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, { title, author, url }) {
    //make api call to add story
    const token = user.loginToken;
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "POST",
      data: { token: token, story: { title, author, url } }
    });
    //save the response as new instance of story
    const story = new Story(response.data.story);
    //Add story to story list
    this.stories.unshift(story);
    //Add story to the user's own stories
    user.ownStories.unshift(story);

    return story;
  }


  async editStory(user, story, { title, author, url }) {
    // collect the story id
    const storyId = story.storyId;
    //remove the story from story list
    this.stories = this.stories.filter(story => story.storyId !== storyId);
    //remove the story form user's own stories
    user.ownStories = user.ownStories.filter(story => story.storyId !== storyId);
    //If it's a favorite remove the story from the user's favorites
    const isAFavoriteStory = Boolean(user.isFavorite(story));
    if (isAFavoriteStory) {
      user.favorites = user.favorites.filter(story => story.storyId !== storyId);
    }
    //Make api call for Patching a story
    const token = user.loginToken;
    const response = await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "PATCH",
      data: { token: token, story: { title, author, url } }
    });
    //save the response 
    const editedStory = new Story(response.data.story);
    //Add the new instance to the story list, own stories, and favorites(if isFavoriteStory is true)
    this.stories.unshift(editedStory);
    user.ownStories.unshift(editedStory);
    if (isAFavoriteStory) {
      user.favorites.unshift(editedStory);
    }

  }



  async deleteStory(user, storyId) {
    const token = user.loginToken;
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: { token: token }
    });

    this.stories = this.stories.filter(story => story.storyId !== storyId);
    user.ownStories = user.ownStories.filter(story => story.storyId !== storyId);
    user.favorites = user.favorites.filter(story => story.storyId !== storyId);
  }

}



/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
    username,
    name,
    createdAt,
    favorites = [],
    ownStories = []
  },
    token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    try {
      const response = await axios({
        url: `${BASE_URL}/signup`,
        method: "POST",
        data: { user: { username, password, name } },
      });

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        response.data.token
      );
    } catch (error) {
      console.error(error)
    }
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  //add to user favorites on API and locally
  async addFavorites(story) {
    const token = this.loginToken;
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method: "POST",
      data: { token: token }
    });
    this.favorites.push(story);
  }

  //Remove to user favorites on API and locally
  async removeFavorites(story) {
    const token = this.loginToken;
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method: "DELETE",
      data: { token: token }
    });
    this.favorites = this.favorites.filter(s => s.storyId !== story.storyId);
  }

  //return boolean for the presence of a story in favorites
  isFavorite(story) {
    return this.favorites.some(s => s.storyId === story.storyId);
  }
  //return boolean for the presence of a story in ownStories
  isOwnStory(story) {
    return this.ownStories.some(s => s.storyId === story.storyId);
  }



}
