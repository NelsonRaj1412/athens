// src/features/project/components/ProjectCreation.tsx

import React, { useState, Suspense, lazy } from 'react';
import { Form, Input, Button, DatePicker, Select, Typography, App, Row, Col, Card, Spin } from 'antd';
import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import dayjs, { Dayjs } from 'dayjs';
import PageLayout from '@common/components/PageLayout';
import { ApiErrorHandler, ValidationRules, handleApiCall } from '../../../utils/apiErrorHandler';

const ProjectMapSelector = lazy(() => import('./ProjectMapSelector'));
const { Title, Text } = Typography;
const { Option } = Select;

import { LocationData } from './ProjectMapSelector';

interface ProjectCreationProps {
  onSuccess?: () => void;
}

const ProjectCreation: React.FC<ProjectCreationProps> = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const { message, modal } = App.useApp();

  const handleLocationChange = (data: LocationData) => {
    const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };
    if (data.position[0] < bounds.south || data.position[0] > bounds.north || data.position[1] < bounds.west || data.position[1] > bounds.east) {
      message.error('Please select a location within India.');
      return;
    }
    setPosition(data.position);
    form.setFieldsValue({
      location: data.address || 'Map Selection',
      locationSearch: data.address || `${data.position[0].toFixed(6)}, ${data.position[1].toFixed(6)}`,
      latitude: data.position[0].toFixed(6),
      longitude: data.position[1].toFixed(6),
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser.');
      return;
    }

    // Show guidance modal for better accuracy
    modal.info({
      title: '📍 Getting Accurate Location',
      content: (
        <div>
          <p><strong>For best GPS accuracy:</strong></p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Move to an open area (away from buildings)</li>
            <li>Enable "High Accuracy" in device location settings</li>
            <li><strong>Turn off WiFi temporarily</strong> (forces GPS instead of WiFi location)</li>
            <li>Wait a few seconds for GPS to lock</li>
          </ul>
          <p style={{ marginTop: '12px', color: '#d32f2f' }}>
            <strong>Important:</strong> If you see Chennai/Coimbatore, that's your WiFi router's location. Turn OFF WiFi to get your real GPS location.
          </p>
        </div>
      ),
      onOk: () => {
        setFetchingLocation(true);
        getCurrentLocationWithRetry();
      },
      okText: 'Get Location',
      cancelText: 'Cancel'
    });
  };

  const getCurrentLocationWithRetry = () => {
    // Force GPS-only location (bypass WiFi databases)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };

        // Check if location is within India
        if (latitude < bounds.south || latitude > bounds.north || longitude < bounds.west || longitude > bounds.east) {
          message.error('Your current location is outside India. Please select a location within India manually.');
          setFetchingLocation(false);
          return;
        }

        // Show accuracy warning if GPS accuracy is poor
        if (accuracy > 100) {
          message.warning(`⚠️ GPS accuracy is ${accuracy.toFixed(0)}m. For better accuracy, move to an open area and try again.`);
        }

        await processLocationData(latitude, longitude, accuracy);
      },
      (error) => {
        // If high accuracy fails, try with lower accuracy as fallback
        console.log('High accuracy failed, trying fallback:', error.message);
        
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };

            if (latitude < bounds.south || latitude > bounds.north || longitude < bounds.west || longitude > bounds.east) {
              message.error('Your current location is outside India. Please select a location within India manually.');
              setFetchingLocation(false);
              return;
            }

            message.warning(`⚠️ Using fallback location (accuracy: ${accuracy.toFixed(0)}m). For better accuracy, try again in an open area with WiFi disabled.`);
            
            await processLocationData(latitude, longitude, accuracy);
          },
          (fallbackError) => {
            setFetchingLocation(false);
            handleLocationError(fallbackError);
          },
          {
            enableHighAccuracy: true, // Still try high accuracy for fallback
            timeout: 20000,
            maximumAge: 0 // No cached data even for fallback
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 45000, // Longer timeout for GPS lock
        maximumAge: 0 // Force fresh GPS reading
      }
    );
  };

  const processLocationData = async (latitude: number, longitude: number, accuracy: number) => {
    try {
      setPosition([latitude, longitude]);
      form.setFieldsValue({
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      });

      let locationInfo = 'Location detected';
      let fullAddress = '';

      try {
        const osmResponse = await api.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        const osmData = osmResponse.data;

        if (osmData.address) {
          const city = osmData.address.city || osmData.address.town || osmData.address.village || osmData.address.suburb || 'Unknown City';
          const state = osmData.address.state || 'Unknown State';
          locationInfo = `${city}, ${state}`;
          fullAddress = osmData.display_name || locationInfo;

          form.setFieldsValue({
            location: locationInfo,
            locationSearch: fullAddress,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          });
        }
      } catch (osmError) {
        form.setFieldsValue({
          location: locationInfo,
          locationSearch: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      }

      const accuracyIcon = accuracy <= 50 ? '🎯' : accuracy <= 100 ? '📍' : '⚠️';
      message.success(`${accuracyIcon} Location: ${locationInfo} (±${accuracy.toFixed(0)}m)`);

    } catch (error) {
      setPosition([latitude, longitude]);
      form.setFieldsValue({
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        location: 'GPS Location',
        locationSearch: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
      message.success(`📍 Raw coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${accuracy.toFixed(0)}m)`);
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleLocationError = (error: GeolocationPositionError) => {
    let locationError = 'Unable to retrieve your location.';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        locationError = '📍 Location Permission Denied: Please allow location access and try again.';
        break;
      case error.POSITION_UNAVAILABLE:
        locationError = '📍 Location Unavailable: Try disabling WiFi to use GPS directly, or move to an open area.';
        break;
      case error.TIMEOUT:
        locationError = '📍 Location Timeout: Move to an open area with clear sky view and try again.';
        break;
      default:
        locationError = `📍 Location Error: ${error.message}`;
        break;
    }

    message.error(locationError);
  };

  const internalOnFinish = async (values: any) => {
    let finalPosition = position;

    // If position is not set from map, try to get from manual lat/lng inputs
    if (!finalPosition) {
      const lat = parseFloat(values.latitude);
      const lng = parseFloat(values.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        finalPosition = [lat, lng];
      }
    }

    if (!finalPosition) {
      message.error('Please select a project location on the map or enter latitude and longitude.');
      return;
    }

    // Ensure location field is set if empty when coordinates are manually entered
    if (!values.location || values.location.trim() === '') {
      values.location = 'Manual Entry';
    }

    const apiData = {
      name: values.projectName?.trim(),
      category: values.projectCategory,
      capacity: values.capacity?.trim(),
      policeStation: values.nearestPoliceStation?.trim(),
      policeContact: values.nearestPoliceStationContact?.trim(),
      hospital: values.nearestHospital?.trim(),
      hospitalContact: values.nearestHospitalContact?.trim(),
      commencementDate: values.commencementDate ? values.commencementDate.format('YYYY-MM-DD') : null,
      deadlineDate: values.deadlineDate.format('YYYY-MM-DD'), // Required field
      location: values.location?.trim(),
      latitude: finalPosition[0], // Send latitude as number
      longitude: finalPosition[1], // Send longitude as number
    };

    // Validate required fields
    const validation = ApiErrorHandler.validateRequiredFields(apiData, ValidationRules.projectCreation);
    if (!validation.isValid) {
      ApiErrorHandler.showValidationErrors(validation.missingFields);
      return;
    }

    setLoading(true);
    try {
      const response = await handleApiCall(
        () => api.post('/authentication/master-admin/projects/create/', apiData),
        'Project Creation'
      );

      if (!response) {
        return; // Error already handled
      }

      message.success('Project created successfully!');
      form.resetFields();
      setPosition(null);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      // Fallback error handling
      console.error('Project creation error:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error || 
                          'Failed to create project.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLetterOnlyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/^[A-Za-z\s]$/.test(e.key)) e.preventDefault();
  };

  const handleNumberOnlyInput = (e: React.KeyboardEvent<HTMLInputElement>, maxLength: number) => {
    if (['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab', 'Delete'].includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key) || e.currentTarget.value.length >= maxLength) e.preventDefault();
  };

  return (
    <PageLayout
      title="Create New Project"
      subtitle="Fill in the details below to register a new project in the system"
      breadcrumbs={[
        { title: 'Projects', href: '/dashboard/projects' },
        { title: 'Create Project' }
      ]}
      actions={
        <Button type="default" onClick={() => window.history.back()}>
          Cancel
        </Button>
      }
    >
      <Card className="max-w-5xl mx-auto">

        <Form form={form} layout="vertical" onFinish={internalOnFinish} size="large" requiredMark="optional">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="Project Name" name="projectName" rules={[{ required: true }]}>
                <Input placeholder="e.g., Western Solar Farm" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Project Category" name="projectCategory" rules={[{ required: true }]}>
                <Select placeholder="Select project category" allowClear>
                  <Option value="governments">Governments</Option>
                  <Option value="manufacturing">Manufacturing</Option>
                  <Option value="construction">Construction</Option>
                  <Option value="chemical">Chemical</Option>
                  <Option value="port_and_maritime">Port and Maritime</Option>
                  <Option value="power_and_energy">Power and Energy</Option>
                  <Option value="logistics">Logistics</Option>
                  <Option value="schools">Schools</Option>
                  <Option value="mining">Mining</Option>
                  <Option value="oil_and_gas">Oil & Gas</Option>
                  <Option value="shopping_mall">Shopping Mall</Option>
                  <Option value="aviation">Aviation</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="Capacity / Size" name="capacity" rules={[{ required: true }]}>
                <Input placeholder="e.g., 100 MW, 5000 sqft" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Location (City, State)" name="location" rules={[{ required: true }]}>
                <Input placeholder="e.g., Mumbai, Maharashtra" onKeyPress={handleLetterOnlyInput} />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Title level={5} className="!mt-4 !mb-2 !text-text-muted">Select Project Coordinates</Typography.Title>
          <Typography.Text type="secondary" className="block mb-4 text-sm">
            💻 <strong>Laptop Users:</strong> Use your phone to get GPS coordinates, then enter them manually below. Laptops show WiFi router location (Chennai/Coimbatore), not your actual location.
          </Typography.Text>

          <Row gutter={24} className="mb-4">
            <Col span={24}>
              <Form.Item label="Search Location" name="locationSearch">
                <Input.Search
                  placeholder="Type address or place in India"
                  onSearch={async (value) => {
                    if (!value) return;
                    try {
                      const response = await api.get(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(value)}&limit=5`);
                      const results = response.data;
                      if (results.length > 0) {
                        const loc = results[0];
                        const lat = parseFloat(loc.lat);
                        const lon = parseFloat(loc.lon);
                        if (lat && lon) {
                          // Extract city and state for the main location field
                          const addressParts = loc.display_name.split(',');
                          let cityState = loc.display_name;
                          if (addressParts.length >= 2) {
                            // Try to get a cleaner city, state format
                            const city = addressParts[0].trim();
                            const state = addressParts[addressParts.length - 2].trim();
                            cityState = `${city}, ${state}`;
                          }

                          handleLocationChange({
                            position: [lat, lon],
                            address: cityState,
                          });
                        }
                      }
                    } catch (error) {
                      // Silently handle search errors
                    }
                  }}
                  enterButton
                  allowClear
                />
              </Form.Item>
              <div className="mb-4 space-y-2">
                <div className="space-x-2">
                  <Button
                    type="primary"
                    icon={<EnvironmentOutlined />}
                    onClick={handleGetCurrentLocation}
                    loading={fetchingLocation}
                    size="large"
                    className="w-full sm:w-auto"
                  >
                    {fetchingLocation ? 'Getting Fresh GPS Location...' : 'Get My Current Location'}
                  </Button>
                  <Button
                    type="default"
                    danger
                    onClick={() => {
                      modal.confirm({
                        title: '🛜 Turn OFF WiFi First!',
                        content: (
                          <div>
                            <p><strong>For Laptop Users:</strong></p>
                            <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
                              <li>Disconnect WiFi temporarily</li>
                              <li>Use mobile hotspot or ethernet</li>
                              <li>Or use your phone to get coordinates</li>
                              <li>Then manually enter lat/lng below</li>
                            </ol>
                            <p style={{ marginTop: '12px', color: '#d32f2f' }}>
                              <strong>Note:</strong> Laptops usually don't have GPS - they rely on WiFi location databases.
                            </p>
                          </div>
                        ),
                        onOk: () => {
                          setFetchingLocation(true);
                          getCurrentLocationWithRetry();
                        },
                        okText: 'Get GPS Location',
                        cancelText: 'Cancel'
                      });
                    }}
                    size="large"
                  >
                    GPS Only (No WiFi)
                  </Button>
                </div>
                {position && (
                  <div className="text-sm text-gray-600 mt-2 space-y-2">
                    <div>
                      <span>📍 Current coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}</span>
                      <Button
                        type="link"
                        size="small"
                        onClick={handleGetCurrentLocation}
                        loading={fetchingLocation}
                        className="ml-2 p-0 h-auto"
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="small"
                        onClick={() => window.open(`https://www.google.com/maps?q=${position[0]},${position[1]}`, '_blank')}
                      >
                        🗺️ Verify on Google Maps
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                <Suspense fallback={<div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Spin tip="Loading Map..." /></div>}>
                  <ProjectMapSelector position={position} onLocationChange={handleLocationChange} />
                </Suspense>
              </div>
            </Col>
          </Row>

          <Row gutter={24} className="mb-4">
            <Col xs={24} md={12}>
              <Form.Item label="Latitude" name="latitude" rules={[{ required: true }]}>
                <Input
                  placeholder="Enter latitude or use current location"
                  value={form.getFieldValue('latitude')}
                  onChange={(e) => {
                    const val = e.target.value;
                    form.setFieldsValue({ latitude: val });
                    // Set location field to "Manual Entry" if empty
                    if (!form.getFieldValue('location')) {
                      form.setFieldsValue({ location: 'Manual Entry' });
                    }
                    const latNum = parseFloat(val);
                    const lngNum = parseFloat(form.getFieldValue('longitude'));
                    const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };
                    if (!isNaN(latNum) && !isNaN(lngNum)) {
                      if (latNum >= bounds.south && latNum <= bounds.north && lngNum >= bounds.west && lngNum <= bounds.east) {
                        setPosition([latNum, lngNum]);
                      } else {
                        setPosition(null);
                      }
                    } else {
                      setPosition(null);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Longitude" name="longitude" rules={[{ required: true }]}>
                <Input
                  placeholder="Enter longitude or use current location"
                  value={form.getFieldValue('longitude')}
                  onChange={(e) => {
                    const val = e.target.value;
                    form.setFieldsValue({ longitude: val });
                    // Set location field to "Manual Entry" if empty
                    if (!form.getFieldValue('location')) {
                      form.setFieldsValue({ location: 'Manual Entry' });
                    }
                    const lngNum = parseFloat(val);
                    const latNum = parseFloat(form.getFieldValue('latitude'));
                    const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };
                    if (!isNaN(latNum) && !isNaN(lngNum)) {
                      if (latNum >= bounds.south && latNum <= bounds.north && lngNum >= bounds.west && lngNum <= bounds.east) {
                        setPosition([latNum, lngNum]);
                      } else {
                        setPosition(null);
                      }
                    } else {
                      setPosition(null);
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Title level={5} className="!mt-4 !mb-4 !text-text-muted">Emergency Contacts</Typography.Title>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="Nearest Police Station" name="nearestPoliceStation" rules={[{ required: true }]}>
                <Input placeholder="Name of the police station" onKeyPress={handleLetterOnlyInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Police Station Contact"
                name="nearestPoliceStationContact"
                rules={[{ required: true, message: "Contact number is required." }, { pattern: /^\d{10}$/, message: 'Must be a 10-digit number' }]}
              >
                <Input placeholder="Enter 10-digit phone number" onKeyPress={(e) => handleNumberOnlyInput(e, 10)} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item label="Nearest Hospital" name="nearestHospital" rules={[{ required: true }]}>
                <Input placeholder="Name of the hospital" onKeyPress={handleLetterOnlyInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Hospital Contact"
                name="nearestHospitalContact"
                rules={[{ required: true, message: "Contact number is required." }, { pattern: /^\d{10}$/, message: 'Must be a 10-digit number' }]}
              >
                <Input placeholder="Enter 10-digit phone number" onKeyPress={(e) => handleNumberOnlyInput(e, 10)} />
              </Form.Item>
            </Col>
          </Row>

          <Typography.Title level={5} className="!mt-4 !mb-4 !text-text-muted">Project Timeline</Typography.Title>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Commencement Date"
                name="commencementDate"
                rules={[
                  { required: true, message: 'Please select a date' },
                  {
                    validator: (_, value: Dayjs) => {
                      if (value && value.isAfter(dayjs())) {
                        return Promise.reject(new Error('Date cannot be in the future'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Deadline Date"
                name="deadlineDate"
                rules={[
                  { required: true, message: 'Please select project deadline date!' },
                  {
                    validator: (_, value: Dayjs) => {
                      const commencementDate = form.getFieldValue('commencementDate');
                      if (value && commencementDate && value.isBefore(commencementDate)) {
                        return Promise.reject(new Error('Deadline date must be after commencement date'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Select project deadline"
                  disabledDate={(current) => {
                    const commencementDate = form.getFieldValue('commencementDate');
                    if (commencementDate) {
                      return current && current.isBefore(commencementDate);
                    }
                    return false;
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mt-8 flex justify-center">
            <Button type="primary" htmlType="submit" loading={loading} size="large" className="min-w-[180px]">Create Project</Button>
          </Form.Item>
        </Form>
      </Card>
    </PageLayout>
  );
};

export default ProjectCreation;
