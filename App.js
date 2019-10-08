// Made by Eric Stein, Matthew Vaysfeld, Sameer Jain, Adam Bougaev, Donald Yang

// Requirements

import React, { Component } from 'react';
import { Button, View, StyleSheet, ScrollView, Image, Alert, Text, Dimensions, TouchableOpacity, Platform, TextInput, Picker, Animated } from 'react-native';
import { Constants, Location, Permissions } from 'expo';
import MapView from 'react-native-maps';
//import { FormLabel, FormInput, FormValidationMessage } from 'react-native-elements'

// Constants

const screen = Dimensions.get('window');

const ASPECT_RATIO = screen.width / screen.height;
const LATITUDE = 40.643501
const LONGITUDE = -74.076202
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const base311URL = 'https://data.cityofnewyork.us/resource/fhrw-4uyv.json?';
const tokenQuery = '$$app_token=mr3vUXRfLAEL26Z1iobH0yJUC';
const limitFilter = '&$limit=1000';
const dateFilter = '&$order=created_date DESC';

const limitFilterForColumns = '&$limit=1000'
const complaintColumnFilter = '&$select=complaint_type'

/*
fetch(base311URL + tokenQuery + limitFilterForColumns + complaintColumnFilter)
  .then(response => response.json())
  .then(responseJson => 
    console.log(responseJson)
  )
  .catch(error => {
    console.error(error);
  });
*/

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

// Form Class

class Form extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    var tempState = {}
    this.props.questions.map((questionData, questionIndex) => {
      switch(questionData.type) {
        case 'drop-down':
              tempState["Question " + questionIndex] = {
                selectedValue: questionData.options[0]
              }
          return
        case 'write-in':
          tempState["Question " + questionIndex] = {
            textValue: questionData.placeholder
          }
         return
      }
    })
    this.state = tempState
  }
  data = {}
  updateQuestionData(questionNumber, newData) {
    this.data['Question ' + questionNumber] = newData
  }
  render() {
    return(
      <ScrollView style={{...this.props.style}}>
        <Text style={{fontSize: 32, textDecorationLine: 'underline', textAlign: 'center'}}>{this.props.title}</Text>
        <Text style={{fontSize: 20}}>{this.props.description}{"\n"}</Text>
        {this.props.questions.map((questionData, questionIndex) => {
          switch(questionData.type) {
            case 'write-in':
              return(
                <View>
                  <Text style={this.styles.question}>Question {questionIndex + 1}: {questionData.question}</Text>
                  <View style={{borderStyle: 'dotted', opacity: 1, borderColor: 'red', borderWidth: 2, height: 50}}>
                    <TextInput 
                      style={{flex:1}}
                      value={this.state["Question " + questionIndex].textValue}
                      onChangeText={(text) => {
                        this.setState({
                          ["Question " + questionIndex]: {
                            textValue: text
                          }
                        })
                        this.updateQuestionData(questionIndex, text)
                      }}
                      multiline= {true}
                      textAlignVertical= 'top'
                    />
                  </View>
                </View>
              )
            case 'drop-down':
              return(
                <View>
                  <Text style={this.styles.question}>Question {questionIndex + 1}: {questionData.question}</Text>
                  <View style={{borderStyle: 'dotted', opacity: 1, borderColor: 'red', borderWidth: 2, height: 100}}>
                    <Picker
                      onValueChange={(itemValue, itemIndex) => {
                        this.setState({
                          ["Question " + questionIndex]: {
                            selectedValue: itemValue
                          }
                        })
                        this.updateQuestionData(questionIndex, itemValue)
                      }}
                      prompt= {questionData.question}
                      selectedValue={this.state["Question " + questionIndex].selectedValue}
                      style={{height: 30, flex: 1}}
                      itemStyle={{height: 30, flex: 1}}
                    >
                      {questionData.options.map(option => {
                        return(
                          <Picker.Item
                            label={option}
                            value={option}
                          />
                        )
                      })}
                    </Picker>
                  </View>
                </View>
              )
          }
        })}
        <Button
          title={this.props.buttonTitle || 'Submit'}
          onPress={() => {
            let dataCopy = Object.assign({}, this.data)
            this.props.onSubmit(dataCopy)
          }}
        />
      </ScrollView>
    )
  }

  styles = StyleSheet.create({
    question: {
      fontSize: 20,
      textAlign: 'left'
    }
  })
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
      userLocation: null,
      errorMessage: null,
      data311: [],
      submittingReport: false,
    };
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
    this.update311Data();
  }

  _handleMapRegionChange = mapRegion => {};

  async update311Data() {
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
      userLocation: location
    }));
  };

  render() {
    return (
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
      >
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
                  {
                    latitude: Number(data.latitude),
                    longitude: Number(data.longitude),
                  }
                }
                title={data.complaint_type}
                description={
                  data.descriptor +
                  ' (Date Created: ' +
                  data.created_date +
                  ')'
                }
              >
                {getIcon(data.complaint_type, data.descriptor) != null && (
                  <Image
                    source={getIcon(data.complaint_type, data.descriptor)}
                    style={{ width: 30.125, height: 61.25 }}
                  />
                )}
                <CustomCallout data={data} />
              </MapView.Marker>
            )
          }
        })}
      </MapView>
    );
  }
}

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reporting: false,
      bottomBarHeight: new Animated.Value(80),
    }
  }
  initialBottomBarHeight = 80
  onReport() {
    var newReporting = !this.state.reporting

    switch(newReporting) {
      case true:
        Animated.timing(this.state.bottomBarHeight, {
          toValue: 7.5*this.initialBottomBarHeight,
          duration: 1000
        }).start()
        break
      case false:
        Animated.timing(this.state.bottomBarHeight, {
          toValue: this.initialBottomBarHeight,
          duration: 1000
        }).start()
        break
    }

    this.setState({
      reporting: newReporting
    })
   
  }
  onReportSubmission(data) {
    Alert.alert("Thank you for the report. We have received the following data from you: " + JSON.stringify(data))
  }
  render() {
    return(
      <View style={styles.container}>
        <MainMap/>
        <Animated.View style={{
          justifyContent: 'center',
          height: this.state.bottomBarHeight,
          alignItems: 'center',
          backgroundColor: 'white',
          flex: 1,
          opacity: 0.8,
          borderStyle: 'solid',
          borderTopWidth: 5
        }}>
          {this.state.reporting == true &&
            <Form
              style= {{}}
              title= {'Report Complaint To 311'}
              description= {'Please fill out the appropriate fields.'}
              onSubmit= {this.onReportSubmission}
              questions= {[
                {
                  type: 'drop-down',
                  question: 'Complaint Type',
                  options: [
                    'Illegal Parking',
                    'Noise - Vehicle',
                    'Noise - Residential',
                    'Blocked Driveway',
                    'Noise - Commercial',
                    'Taxi Complaint',
                    'Request Large Bulky Item Collection',
                    'Street Condition',
                    'HPD Literature Request',
                    'Street Condition',
                    'Rodent',
                    'Heating',
                    'HEAT/HOT WATER',
                    'Derelict Vehicle'
                  ]
                },
                {
                  type: 'write-in',
                  question: 'Complaint Description',
                  placeholder: ''
                }
              ]}
            />
          }
          <Button title={this.state.reporting == false && "Report" || "Cancel"} onPress={this.onReport.bind(this)} style={{flex:1}}/>
        </Animated.View>
      </View>
    )
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
    width: 300,
    height: 75,
    alignItems: 'center',
    alignContent: 'center',
  },
  bottomBar: {
    justifyContent: 'center',
    height: 80,
    alignItems: 'center',
    backgroundColor: 'white',
    flex: 1,
    opacity: 0.8
  }
});
