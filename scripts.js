const grid = document.getElementById("grid");
const loadBtn = document.getElementById("load-btn");
const subredditPicker = document.getElementById("subreddit-picker");
const sortPicker = document.getElementById("sort-picker");
const nsfwPicker = document.getElementById("nsfw-picker");
const loader = document.getElementById("loader");
const prog = document.getElementById("prog");
const imageViewer = document.getElementById("image-viewer-container");
const overlay = document.getElementById("overlay");
const showTitlesChx = document.getElementById("post-titles-chx");
let imagesLoaded = 0;
let imagesErrored = 0;
let timesTried = 0;
let afterParam = "";
let imagePosts = [];
let bigplayer;
let cards = 0;

function FetchImagePosts(minPosts, tempImages) {
	console.log(
		`Fetching 20 more posts from r/${subredditPicker.value}. Minimum image posts required: ${minPosts}, already have ${tempImages.length} image posts.`
	);
	let url = `https://www.reddit.com/r/${subredditPicker.value}/${sortPicker.value}.json?limit=20&t=all&show=all`;
	if (imagePosts.length > 0) {
		url += `&after=${afterParam}`;
	}
	console.log(`Using URL: ${url}`);
	return fetch(url)
		.then((res) => res.json())
		.then((res) => {
			console.dir(res);
			if (res.data.children.length > 0) {
				timesTried++;
				console.log(`Got more unfiltered posts: ${res.data.children.length}`);
				afterParam = res.data.after;
				if (nsfwPicker.value == "all") {
					let filteredPosts = res.data.children
						.filter(
							(post) =>
								post.data.is_gallery == true ||
								post.data.post_hint === "image" ||
								(post.data.post_hint === "link" &&
									post.data.domain.includes("imgur.com")) ||
								(post.data.post_hint === "rich:video" &&
									post.data.domain === "redgifs.com") ||
								(post.data.is_video && post.data.domain === "v.redd.it")
						)
						.map((post) => post.data)
						.filter((post) => !imagePosts.some((image) => image.id == post.id));
					console.log(`Filtered posts: ${filteredPosts.length}`);
					tempImages = tempImages.concat(filteredPosts);
				} else {
					let filteredPosts = res.data.children
						.filter(
							(post) =>
								(post.data.is_gallery == true ||
									post.data.post_hint === "image" ||
									(post.data.post_hint === "link" &&
										post.data.domain.includes("imgur.com")) ||
									(post.data.post_hint === "rich:video" &&
										post.data.domain === "redgifs.com") ||
									(post.data.is_video && post.data.domain === "v.redd.it")) &&
								post.data.over_18 == !!nsfwPicker.value
						)
						.map((post) => post.data)
						.filter((post) => !imagePosts.some((image) => image.id == post.id));
					console.log(`Filtered posts: ${filteredPosts.length}`);
					tempImages = tempImages.concat(filteredPosts);
				}
				if (tempImages == 0 && timesTried > 5) {
					swal(
						"Error getting subreddit!",
						"That subreddit has no image posts!",
						"error"
					);
					console.log("Removing loader due to no posts...", tempImages, timesTried);
					loader.style.opacity = 0;
					prog.style.opacity = 0;
					grid.classList.remove("blur");
				} else {
					if (tempImages.length < minPosts) {
						console.log(
							"Need more images, trying again. Times already tried: " + timesTried
						);
						return FetchImagePosts(minPosts, tempImages);
					} else {
						imagePosts = imagePosts.concat(tempImages);
					}
				}
			} else {
				swal(
					"Error getting subreddit!",
					"That subreddit does not exist or has no image posts!",
					"error"
				);
				console.log("Removing loader due to no data response...", res);
				loader.style.opacity = 0;
				prog.style.opacity = 0;
				grid.classList.remove("blur");
			}
		})
		.catch((err) => {
			swal(
				"Error getting subreddit!",
				"That subreddit does not exist or has no image posts!",
				"error"
			);
			console.log("Removing loader due to error getting response...", err);
			loader.style.opacity = 0;
			prog.style.opacity = 0;
			grid.classList.remove("blur");
		});
}

function ResetParams() {
	imagesLoaded = 0;
	imagesErrored = 0;
	timesTried = 0;
	cards = 0;
	afterParam = "";
	imagePosts = [];
	prog.removeAttribute("max");
	prog.removeAttribute("value");
}

showTitlesChx.addEventListener("change", function (evt) {
	for (let i = 0; i < grid.children.length; i++) {
		if (showTitlesChx.checked) {
			grid.children[i].children[1].classList.remove("hidden");
		} else {
			grid.children[i].children[1].classList.add("hidden");
		}
	}
	console.log("Resizing due to title change...");
	ResizeAllImages();
});

loadBtn.addEventListener("click", function (event) {
	if (subredditPicker.value != "") {
		console.log("Showing loader due to click...");
		loader.style.opacity = 0.25;
		prog.style.opacity = 0.25;
		// grid.classList.add("blur");
		grid.innerHTML = "";
		ResetParams();
		MakeMoreCards(40);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}
});

subredditPicker.addEventListener("keydown", function (event) {
	if (event.key == "Enter") {
		if (subredditPicker.value != "") {
			console.log("Showing loader due to enter...");
			loader.style.opacity = 0.25;
			prog.style.opacity = 0.25;
			// grid.classList.add("blur");
			grid.innerHTML = "";
			ResetParams();
			MakeMoreCards(40);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}
});

function htmlDecode(input) {
	let doc = new DOMParser().parseFromString(input, "text/html");
	return doc.documentElement.textContent;
}

function TruePosts() {
	return imagePosts.reduce((prev, curr, index, array) => {
		if (curr.is_gallery == true) {
			return prev + curr.gallery_data.items.length;
		} else {
			return prev + 1;
		}
	}, 0);
}

function MakeMoreCards(minCards) {
	FetchImagePosts(minCards, []).then(function () {
		cards = 0;
		imagesLoaded = 0;
		imagesErrored = 0;
		imagePosts.forEach(function (post) {
			if (post.url) {
				if (post.domain == "i.imgur.com" || post.domain == "imgur.com") {
					post.url = post.url.replace("http://", "https://");
					if (post.url.includes("imgur.com/a/")) {
						console.log(
							"Error loading imgur post with url " +
								post.url +
								": is actually an album."
						);
					} else {
						cards++;
						prog.max = cards;
						CreateCard(post.id, post.url, post.title, post.permalink, "image");
					}
				} else {
					if (post.is_gallery == true) {
						post.gallery_data.items.forEach(function (gallery_item, index) {
							if (
								post.media_metadata[gallery_item.media_id].status == "valid" &&
								post.media_metadata[gallery_item.media_id].e == "Image"
							) {
								if (gallery_item.caption) {
									cards++;
									prog.max = cards;
									CreateCard(
										post.id + "-" + (index + 1),
										htmlDecode(post.media_metadata[gallery_item.media_id].s.u),
										post.title + " - " + (index + 1) + " - " + gallery_item.caption,
										post.permalink,
										"image"
									);
								} else {
									cards++;
									prog.max = cards;
									CreateCard(
										post.id + "-" + (index + 1),
										htmlDecode(post.media_metadata[gallery_item.media_id].s.u),
										post.title + " - " + (index + 1),
										post.permalink,
										"image"
									);
								}
							} else if (
								post.media_metadata[gallery_item.media_id].status == "valid" &&
								post.media_metadata[gallery_item.media_id].e == "Video"
							) {
								if (gallery_item.caption) {
									cards++;
									prog.max = cards;
									CreateCard(
										post.id + "-" + (index + 1),
										htmlDecode(post.media_metadata[gallery_item.media_id].s.u),
										post.title + " - " + (index + 1) + " - " + gallery_item.caption,
										post.permalink,
										"video"
									);
								} else {
									cards++;
									prog.max = cards;
									CreateCard(
										post.id + "-" + (index + 1),
										htmlDecode(post.media_metadata[gallery_item.media_id].s.u),
										post.title + " - " + (index + 1),
										post.permalink,
										"video"
									);
								}
							}
						});
					} else {
						if (post.post_hint === "rich:video") {
							try {
								cards++;
								prog.max = cards;
								CreateCard(
									post.id,
									post.preview.reddit_video_preview.fallback_url,
									post.title,
									post.permalink,
									"video"
								);
							} catch (err) {
								console.log(post);
								console.log("Error creating rich video card: ", err);
							}
						} else if (post.is_video && post.domain === "v.redd.it") {
							try {
								cards++;
								prog.max = cards;
								CreateCard(
									post.id,
									post.secure_media.reddit_video.dash_url,
									post.title,
									post.permalink,
									"video"
								);
							} catch (err) {
								console.log(post);
								console.log("Error creating hosted video card: ", err);
							}
						} else {
							cards++;
							prog.max = cards;
							CreateCard(
								post.id,
								post.url.replace("http://", "https://"),
								post.title,
								post.permalink,
								"image"
							);
						}
					}
				}
			}
		});
		if (imagesLoaded > 0 && imagesLoaded + imagesErrored == cards) {
			console.log(
				"Resizing all images due to all cards created...",
				imagesLoaded,
				imagesErrored,
				cards
			);
			setTimeout(ResizeAllImages, 100);
			ResizeAllImages();
		}
	});
}

function ResizeImage(img) {
	let rowHeight = parseInt(
		window.getComputedStyle(grid).getPropertyValue("grid-auto-rows")
	);
	let rowGap = parseInt(
		window.getComputedStyle(grid).getPropertyValue("grid-row-gap")
	);
	// console.log(
	// 	`Resizing image ${img.children[0].src}, original height: ${img.children[0].dataset.height}`
	// );
	if (img.getBoundingClientRect().height == 0) {
		console.log("Deleting broken image...");
		grid.removeChild(img);
	} else {
		let eleWidth = img.getBoundingClientRect().width;
		let oldWidth = Number(img.children[0].dataset.width);
		let oldHeight = Number(img.children[0].dataset.height);
		let newHeight = (eleWidth / oldWidth) * oldHeight;
		if (showTitlesChx.checked) {
			newHeight += img.children[1].getBoundingClientRect().height;
		}
		img.style.gridRowEnd =
			"span " + Math.ceil((newHeight + rowGap) / (rowHeight + rowGap));
		img.style.opacity = 1;
	}
}

function ResizeAllImages() {
	console.log("Resizing all images...");
	loader.style.opacity = 0;
	prog.style.opacity = 0;
	grid.classList.remove("blur");
	enableScroll();
	let images = document.getElementsByClassName("card");
	for (let i = 0; i < images.length; i++) {
		ResizeImage(images[i]);
	}
}

window.addEventListener("resize", function (event) {
	if (
		grid.children.length > 0 &&
		loader.style.opacity != 1 &&
		subredditPicker.value != ""
	) {
		console.log("Resizing all images due to window resize...");
		ResizeAllImages();
	}
});

window.addEventListener("scroll", function (event) {
	if (
		window.innerHeight + window.scrollY >= document.body.offsetHeight &&
		grid.children.length > 0 &&
		loader.style.opacity != 1 &&
		subredditPicker.value != ""
	) {
		console.log("Showing loader due to scroll...");
		loader.style.opacity = 0.25;
		prog.style.opacity = 0.25;
		// grid.classList.add("blur");
		disableScroll();
		MakeMoreCards(40);
	}
});

function CreateCard(id, src, postTitle, link, type) {
	if (document.getElementById(id) == null) {
		let card = document.createElement("div");
		card.classList.add("card");
		let image = null;
		let timer;
		function clearTimer() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
		}
		if (type == "image") {
			image = new Image();
			image.onload = function () {
				imagesLoaded++;
				prog.value = imagesLoaded + imagesErrored;
				clearTimer();
				console.log(
					`Loaded image ${image.src} - Images loaded: ${imagesLoaded}/${cards}. Images errored: ${imagesErrored}/${cards}.`
				);
				image.dataset.height = image.naturalHeight;
				image.dataset.width = image.naturalWidth;
				if (imagesLoaded + imagesErrored == cards) {
					console.log("Resizing all images due to image load...");
					setTimeout(ResizeAllImages, 100);
					ResizeAllImages();
				}
			};
			image.onerror = function (err) {
				imagesErrored++;
				prog.value = imagesLoaded + imagesErrored;
				clearTimer();
				console.log(
					`Error setting image: ${image.src} - Images loaded: ${imagesLoaded}/${cards}. Images errored: ${imagesErrored}/${cards}.`
				);
				console.log("Deleting broken image...");
				image.onload = null;
				image.onerror = null;
				image.src = "";
				image.remove();
				card.remove();
				if (imagesLoaded + imagesErrored == cards) {
					console.log("Resizing all images due to image error...");
					setTimeout(ResizeAllImages, 100);
					ResizeAllImages();
				}
			};
		} else if (type == "video") {
			image = document.createElement("video");
			image.autoplay = true;
			image.loop = true;
			image.muted = true;
			image.addEventListener("loadeddata", (e) => {
				if (image.readyState >= 3) {
					imagesLoaded++;
					prog.value = imagesLoaded + imagesErrored;
					clearTimer();
					console.log(
						`Loaded video ${image.src} - Images loaded: ${imagesLoaded}/${cards}. Images errored: ${imagesErrored}/${cards}.`
					);
					image.dataset.height = image.videoHeight;
					image.dataset.width = image.videoWidth;
					if (imagesLoaded + imagesErrored == cards) {
						console.log("Resizing all images due to video load...");
						setTimeout(ResizeAllImages, 100);
						ResizeAllImages();
					}
				}
			});
			// image.addEventListener("error", (err) => {
			// 	imagesErrored++;
			// 	prog.value = imagesLoaded + imagesErrored;
			// 	clearTimer();
			// 	console.log(
			// 		`Timer - Error setting video: ${image.src} - Images loaded: ${imagesLoaded}/${cards}. Images errored: ${imagesErrored}/${cards}.`
			// 	);
			// 	console.log("Timer - Deleting broken video...");
			// 	image.onload = null;
			// 	image.onerror = null;
			// 	image.src = "";
			// 	image.remove();
			// 	card.remove();
			// 	if (imagesLoaded + imagesErrored == cards) {
			// 	console.log("Resizing all images due to video error...");
			// 		setTimeout(ResizeAllImages, 100);
			//	ResizeAllImages();
			// 	}
			// });
		}
		image.id = id;
		card.appendChild(image);
		let title = document.createElement("span");
		title.innerHTML = `<a href="https://www.reddit.com${link}">${postTitle}</a>`;
		card.appendChild(title);
		if (!showTitlesChx.checked) {
			title.classList.add("hidden");
		}
		card.addEventListener("click", ExpandImage);
		grid.appendChild(card);
		image.src = src;
		image.dataset.src = src;
		if (type == "video") {
			let player = dashjs.MediaPlayer().create();
			player.initialize(image, src, true);
		}
		timer = setTimeout(function () {
			imagesErrored++;
			prog.value = imagesLoaded + imagesErrored;
			clearTimer();
			console.log(
				`Timer - Error setting card: ${image.src} - Images loaded: ${imagesLoaded}/${cards}. Images errored: ${imagesErrored}/${cards}.`
			);
			console.log("Timer - Deleting broken card...");
			image.onload = null;
			image.onerror = null;
			image.src = "";
			image.remove();
			card.remove();
			if (imagesLoaded + imagesErrored == cards) {
				console.log("Resizing all images due to timer...");
				setTimeout(ResizeAllImages, 100);
				ResizeAllImages();
			}
		}, 30000);
	} else {
		console.log(`Image with id ${id} already exists in DOM. Skipping...`);
		imagesLoaded++;
		prog.value = imagesLoaded + imagesErrored;
	}
}

function ExpandImage(event) {
	console.log(
		"Expanding image...",
		{
			src: event.currentTarget.children[0].src,
			title: event.currentTarget.children[1].innerHTML
		},
		event.currentTarget.children[0].tagName.toLowerCase()
	);
	overlay.classList.remove("hidden");
	let selectedCard = event.currentTarget;
	if (selectedCard.children[0].tagName.toLowerCase() == "img") {
		imageViewer.children[0].src = selectedCard.children[0].src;
		imageViewer.children[0].classList.remove("hidden");
		imageViewer.children[1].classList.add("hidden");
		imageViewer.children[1].src = "";
	} else if (selectedCard.children[0].tagName.toLowerCase() == "video") {
		//imageViewer.children[1].src = selectedCard.children[0].src;
		imageViewer.children[1].autoplay = true;
		imageViewer.children[1].loop = true;
		imageViewer.children[1].muted = true;
		imageViewer.children[1].classList.remove("hidden");
		imageViewer.children[0].classList.add("hidden");
		imageViewer.children[0].src = "";
	}
	imageViewer.children[2].innerHTML =
		selectedCard.children[1].children[0].innerHTML;
	imageViewer.children[2].href = selectedCard.children[1].children[0].href;
	overlay.classList.add("expanded");
	// grid.classList.add("blur");
	if (
		selectedCard.children[0].tagName.toLowerCase() == "video" &&
		selectedCard.children[0].dataset.src.includes(".mpd")
	) {
		bigplayer = videojs("image-viewer-video");

		bigplayer.ready(function () {
			console.log(
				"Video.js player ready. Setting src...",
				selectedCard.children[0].dataset.src
			);
			bigplayer.src({
				src: selectedCard.children[0].dataset.src,
				type: "application/dash+xml"
			});

			bigplayer.play();
		});
	} else if (selectedCard.children[0].dataset.src.includes(".mp4")) {
		bigplayer = videojs("image-viewer-video");

		bigplayer.ready(function () {
			console.log(
				"Video.js player ready. Setting src...",
				selectedCard.children[0].dataset.src
			);
			bigplayer.src({
				src: selectedCard.children[0].dataset.src,
				type: "video/mp4"
			});

			bigplayer.play();
		});
	}
	console.log("Expanded image.", {
		src: event.currentTarget.children[0].src,
		title: event.currentTarget.children[1].innerHTML
	});
}

overlay.addEventListener("click", function (event) {
	if (event.target.id == "image-viewer-pic" || event.target.id == "overlay") {
		console.log("Shrinking image...", {
			src: imageViewer.children[0].src,
			title: imageViewer.children[1].innerHTML
		});
		overlay.classList.add("hidden");
		imageViewer.children[0].src = "";
		imageViewer.children[1].src = "";
		imageViewer.children[1].classList.add("hidden");
		imageViewer.children[0].classList.add("hidden");
		imageViewer.children[1].autoplay = false;
		imageViewer.children[1].loop = false;
		imageViewer.children[2].innerHTML = "";
		imageViewer.children[2].href = "";
		overlay.classList.remove("expanded");
		grid.classList.remove("blur");
		console.log("Shrunk image.", {
			src: imageViewer.children[0].src,
			title: imageViewer.children[1].innerHTML
		});
	}
});

let keys = {37: 1, 38: 1, 39: 1, 40: 1};

function preventDefault(e) {
  e.preventDefault();
}

function preventDefaultForScrollKeys(e) {
  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

let supportsPassive = false;
try {
  window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
    get: function () { supportsPassive = true; } 
  }));
} catch(e) {}

let wheelOpt = supportsPassive ? { passive: false } : false;
let wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

function disableScroll() {
  window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
  window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
  window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
  window.addEventListener('keydown', preventDefaultForScrollKeys, false);
}

function enableScroll() {
  window.removeEventListener('DOMMouseScroll', preventDefault, false);
  window.removeEventListener(wheelEvent, preventDefault, wheelOpt); 
  window.removeEventListener('touchmove', preventDefault, wheelOpt);
  window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
}