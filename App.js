// Made by Eric Stein, Matthew Vaysfeld, Sameer Jain, Adam Bougaev, Dong Yang

// Requirements

import React, { Component } from 'react';
import { Button, View, StyleSheet, ScrollView, Image, Alert, Text, Dimensions, TouchableOpacity, Platform  } from 'react-native';
import { Constants, MapView, Location, Permissions } from 'expo';
//import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'

// Constants

const screen = Dimensions.get('window');

const ASPECT_RATIO = screen.width / screen.height;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const base311URL = 'https://data.cityofnewyork.us/resource/fhrw-4uyv.json?';
const tokenQuery = '$$app_token=mr3vUXRfLAEL26Z1iobH0yJUC';
const limitFilter = '&$limit=1000';
const dateFilter = '&$order=created_date DESC';

// Icons

const iconsFolder = './Icons';
const icons = {
  Parking: require('./Icons/parking.png'),
};

function getIcon(complaintType, descriptor) {
  for (var key in icons) {
    if (complaintType.indexOf(key) != -1) {
      return icons[key];
    }
  }
  return null;
}

// Custom Marker Callout

class CustomCallout extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <MapView.Callout style={styles.customCallout}>
        <ScrollView style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20 }}>{this.props.data.complaint_type}</Text>
          <Text>{this.props.data.descriptor}</Text>
          <Text>Date Created: {this.props.data.created_date}</Text>
        </ScrollView>
      </MapView.Callout>
    );
  }
}

// Map Class

class MainMap extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinate: new MapView.AnimatedRegion({
        latitude: LATITUDE,
        longitude: LONGITUDE,
      }),
      userLocation: null,
      errorMessage: null,
      data311: [],
      submittingReport: false,
    };
  }

  onReport() {
    Alert.alert("Button Pressed", "testing")
  }

  componentWillMount() {
    if (Platform.OS === 'android' && !Constants.isDevice) {
      this.setState({
        errorMessage:
          'Oops, this will not work on Sketch in an Android emulator. Try it on your device!',
      });
    } else {
      this._getLocationAsync();
    }

    /*
    setInterval(() => {
      this.update311Data()
    }, 1000 * 60) */
    this.update311Data();
  }

  _handleMapRegionChange = mapRegion => {};

  async update311Data() {
    // Get ReverseGeocode Location

    // Create Filters from ReverseGeocode data

    fetch(base311URL + tokenQuery + limitFilter + dateFilter)
      .then(response => response.json())
      .then(responseJson => {
        this.setState({
          data311: responseJson,
        });
      })
      .catch(error => {
        console.error(error);
      });
  }

  _getLocationAsync = async () => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        errorMessage: 'Permission to access location was denied',
      });
    }

    let location = await Location.getCurrentPositionAsync({});
    this.setState(() => ({
      userLocation: location,
    }));
  };

  render() {
    return (
      <View style={styles.container}>
        <MapView
          provider={this.props.provider}
          style={styles.map}
          region={{
            latitude:
              (this.state.userLocation &&
                this.state.userLocation.coords.latitude) ||
              LATITUDE,
            longitude:
              (this.state.userLocation &&
                this.state.userLocation.coords.longitude) ||
              LONGITUDE,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          followUserLocation={true}
          onRegionChange={this._handleMapRegionChange}>
          {this.state.data311.map(data => {
            if (
              data.latitude &&
              data.longitude &&
              data.complaint_type &&
              data.descriptor &&
              data.created_date
            ) {
              return (
                <MapView.Marker
                  coordinate={
                    new MapView.AnimatedRegion({
                      latitude: data.latitude,
                      longitude: data.longitude,
                    })
                  }
                  title={data.complaint_type}
                  description={
                    data.descriptor +
                    ' (Date Created: ' +
                    data.created_date +
                    ')'
                  }
                  //image={getIcon(data.complaint_type, data.descriptor)}
                >
                  {getIcon(data.complaint_type, data.descriptor) && (
                    <Image
                      source={getIcon(data.complaint_type, data.descriptor)}
                      style={{ width: 30.125, height: 61.25 }}
                    />
                  )}
                  <CustomCallout data={data} />
                </MapView.Marker>
              );
            }
          })}
          // current location marker /*
          {this.state.userLocation && <MapView.Marker />}
        </MapView>
        <View style={styles.bottomBar}>
          <Button title="Report" onPress={this.onReport} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row'
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
  plainView: {
    width: 60,
  },
  customCallout: {
    /*
    shadowOffset: {width: 10, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 5,
    */
    width: 300,
    height: 75,
    alignItems: 'center',
    alignContent: 'center',
  },
  bottomBar: {
    justifyContent: 'center',
    height: 60,
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    opacity: 0.8
  }
});

export default class App extends Component {
  render() {
    return <MainMap />;
  }
}
