mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  projection: 'globe', // Display the map as a globe, since satellite-v9 defaults to Mercator
  zoom: 13,
  center: [mapData.longitude, mapData.latitude],
});

const marker = new mapboxgl.Marker()
  .setLngLat([mapData.longitude, mapData.latitude])
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <h3>${campground.title}</h3>
      <p>${campground.location}</p>
      `)
  )
  .addTo(map);
