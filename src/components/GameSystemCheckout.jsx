import React, { useState, useEffect } from 'react';
import { Gamepad2, Monitor, CheckCircle, XCircle, Clock, AlertTriangle, Send, Users, Calendar, MapPin, DollarSign, BarChart3, Settings, ChevronRight, Sparkles, RefreshCw, Cable, Tv, LogOut, Bell, Package, UserCog, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { systemsService } from '../services/systemsService';
import { requestsService } from '../services/requestsService';
import { usersService } from '../services/usersService';

const UNITS = ['PICU', 'NICU', 'HEMONC', 'Dialysis', 'Cardiac', '3 East', '3 West', '4 East', '4 West', '5 West'];
const ROOMS = Array.from({ length: 48 }, (_, i) => i + 1);

// Status Badge Component
function StatusBadge({ status }) {
  const styles = {
    pending_confirmation: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Confirmation' },
    pending_review: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Admin Review' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
    checked_out: { bg: 'bg-green-100', text: 'text-green-800', label: 'Checked Out' },
    pending_return: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Return Pending' },
    returned: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Returned' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  };
  const style = styles[status] || styles.pending_confirmation;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// AI System Recommendation Logic
function getAIRecommendation(data) {
  const controllers = parseInt(data.controllers) || 1;
  const needsHDMI = data.needsHDMI;
  const needsEthernet = data.needsEthernet;

  let recommendedType = 'Switch';
  let reason = '';

  if (data.purpose === 'vr_event') {
    recommendedType = 'Meta Quest Pro';
    reason = 'Quest Pro recommended for VR events with best tracking and display quality.';
  } else if (data.purpose === 'vr_demo') {
    recommendedType = 'Oculus Quest 2';
    reason = 'Quest 2 is great for VR demos and easier for new users.';
  } else if (controllers > 3 || needsEthernet) {
    if (data.purpose === 'tournament') {
      recommendedType = 'PS5 Cart';
      reason = 'PS5 Cart recommended for tournaments - includes 4 controllers and ethernet for stable online play.';
    } else {
      recommendedType = 'Xbox Cart';
      reason = `Cart system recommended for ${controllers} controllers with full cable setup.`;
    }
  } else if (controllers > 2) {
    recommendedType = 'Switch';
    reason = 'Switch offers flexible multiplayer with up to 4 controllers in a portable format.';
  } else {
    recommendedType = 'PS5 Bag System';
    reason = 'Bag system is portable and perfect for smaller setups with 1-2 controllers.';
  }

  return { recommendedType, reason };
}

// Check for flags
function checkForFlags(formData) {
  const flags = [];
  if (!formData.startDate) return flags;

  const start = new Date(formData.startDate);
  const end = formData.endDate ? new Date(formData.endDate) : start;
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (days > 7) flags.push(`Extended duration (${days} days)`);
  if (start.getDay() === 0 || start.getDay() === 6) flags.push('Weekend pickup');
  if (parseInt(formData.controllers) > 4) flags.push('High controller count');

  return flags;
}

export default function GameSystemCheckout() {
  const { currentUser, userProfile, isAdmin, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('request');
  const [adminSubTab, setAdminSubTab] = useState('requests');

  // Firebase data
  const [requests, setRequests] = useState([]);
  const [systems, setSystems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [users, setUsers] = useState([]);

  // User management filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userDepartmentFilter, setUserDepartmentFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Form state
  const [formStep, setFormStep] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [availableSystems, setAvailableSystems] = useState([]);
  const [editingSystem, setEditingSystem] = useState(null);

  const [controllers, setControllers] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [unit, setUnit] = useState('');
  const [room, setRoom] = useState('');
  const [needsHDMI, setNeedsHDMI] = useState(true);
  const [needsEthernet, setNeedsEthernet] = useState(false);
  const [needsUSB, setNeedsUSB] = useState(false);
  const [needsPower, setNeedsPower] = useState(true);

  const formData = { controllers, purpose, startDate, endDate, unit, room, needsHDMI, needsEthernet, needsUSB, needsPower };

  // Subscribe to real-time data
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to systems
    const unsubscribeSystems = systemsService.subscribeToSystems((systemsData) => {
      setSystems(systemsData);
    });

    // Subscribe to user's requests
    const unsubscribeUserRequests = requestsService.subscribeToUserRequests(
      currentUser.uid,
      (requestsData) => {
        setUserRequests(requestsData);
      }
    );

    // Subscribe to all requests if admin
    let unsubscribeAllRequests;
    let unsubscribeNotifications;
    let unsubscribeUsers;
    if (isAdmin) {
      unsubscribeAllRequests = requestsService.subscribeToRequests((requestsData) => {
        setRequests(requestsData);
      });

      // Subscribe to notifications
      unsubscribeNotifications = requestsService.subscribeToNotifications((notificationsData) => {
        setNotifications(notificationsData);
      });

      // Subscribe to users
      unsubscribeUsers = usersService.subscribeToUsers((usersData) => {
        setUsers(usersData);
      });

      return () => {
        unsubscribeSystems();
        unsubscribeUserRequests();
        unsubscribeAllRequests();
        unsubscribeNotifications();
        unsubscribeUsers();
      };
    }

    return () => {
      unsubscribeSystems();
      unsubscribeUserRequests();
    };
  }, [currentUser, isAdmin]);

  // Check Availability
  const checkAvailability = () => {
    setIsChecking(true);
    setTimeout(() => {
      const recommendation = getAIRecommendation(formData);
      setAiSuggestion(recommendation);

      const available = systems.filter(s =>
        s.available &&
        s.controllers >= parseInt(controllers || 1) &&
        (!needsHDMI || s.cables.hdmi) &&
        (!needsEthernet || s.cables.ethernet) &&
        (!needsUSB || s.cables.usb)
      );
      setAvailableSystems(available);
      setIsChecking(false);
      setFormStep(2);
    }, 1500);
  };

  // Submit Request
  const submitRequest = async () => {
    try {
      const flags = checkForFlags(formData);
      const requestData = {
        systemId: selectedSystem.id,
        systemName: selectedSystem.name,
        systemType: selectedSystem.type,
        unit: unit,
        room: room,
        startDate: startDate,
        endDate: endDate || startDate,
        purpose: purpose,
        controllers: parseInt(controllers),
        flagged: flags.length > 0,
        flagReason: flags.join(', ')
      };

      await requestsService.createRequest(requestData, currentUser.uid, userProfile);
      setFormStep(4);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  const resetForm = () => {
    setFormStep(1);
    setControllers('');
    setPurpose('');
    setStartDate('');
    setEndDate('');
    setUnit('');
    setRoom('');
    setNeedsHDMI(true);
    setNeedsEthernet(false);
    setNeedsUSB(false);
    setNeedsPower(true);
    setSelectedSystem(null);
    setAiSuggestion(null);
    setAvailableSystems([]);
  };

  // Handle return request from user
  const handleReturnRequest = async (requestId) => {
    try {
      await requestsService.initiateReturn(requestId, currentUser.uid);
      alert('Return request submitted. An admin will process it shortly.');
    } catch (error) {
      console.error('Error initiating return:', error);
      alert('Failed to submit return request. Please try again.');
    }
  };

  // Handle confirm return from admin
  const handleConfirmReturn = async (requestId, systemId) => {
    try {
      await requestsService.confirmReturn(requestId, systemId);
    } catch (error) {
      console.error('Error confirming return:', error);
      alert('Failed to confirm return. Please try again.');
    }
  };

  const flags = checkForFlags(formData);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Gamepad2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Game System Checkout</h1>
              <p className="text-sm text-gray-500">Equipment Request Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userProfile?.displayName}</p>
              <p className="text-xs text-gray-500">{userProfile?.department}</p>
            </div>
            {isAdmin && notifications.length > 0 && (
              <div className="relative">
                <Bell className="text-orange-500" size={20} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              </div>
            )}
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
              activeTab === 'request'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Gamepad2 size={18} />
            New Request
          </button>

          <button
            onClick={() => setActiveTab('my-checkouts')}
            className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
              activeTab === 'my-checkouts'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package size={18} />
            My Checkouts
            {userRequests.filter(r => r.status === 'checked_out').length > 0 && (
              <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                {userRequests.filter(r => r.status === 'checked_out').length}
              </span>
            )}
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === 'admin'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings size={18} />
                Admin Queue
                {notifications.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                    {notifications.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 size={18} />
                Analytics
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content - Request Tab will be rendered here */}
      <main className="p-6 max-w-6xl mx-auto">
        {activeTab === 'request' && renderRequestTab()}
        {activeTab === 'my-checkouts' && renderMyCheckoutsTab()}
        {isAdmin && activeTab === 'admin' && renderAdminTab()}
        {isAdmin && activeTab === 'analytics' && renderAnalyticsTab()}
      </main>
    </div>
  );

  // Render Functions (to be continued in next part)
  function renderRequestTab() {
    return (
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['Request Details', 'Select System', 'Confirm & Review', 'Complete'].map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${formStep > idx + 1 ? 'bg-green-500 text-white' : formStep === idx + 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {formStep > idx + 1 ? <CheckCircle size={16} /> : idx + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${formStep >= idx + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{step}</span>
              {idx < 3 && <ChevronRight className="mx-2 sm:mx-4 text-gray-300" size={20} />}
            </div>
          ))}
        </div>

        {/* Step 1: Request Details */}
        {formStep === 1 && renderStep1()}

        {/* Step 2: System Selection */}
        {formStep === 2 && renderStep2()}

        {/* Step 3: Confirmation */}
        {formStep === 3 && renderStep3()}

        {/* Step 4: Success */}
        {formStep === 4 && renderStep4()}
      </div>
    );
  }

  function renderStep1() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="text-purple-500" size={20} />
          Tell us about your event
        </h3>
        <p className="text-sm text-gray-500 mb-6">Our AI will recommend the best system based on your needs.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Controllers Needed</label>
            <input
              type="number"
              min="1"
              max="8"
              value={controllers}
              onChange={(e) => setControllers(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="How many controllers?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Purpose</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select purpose...</option>
              <option value="casual_gaming">Casual Gaming</option>
              <option value="tournament">Tournament</option>
              <option value="vr_event">VR Event</option>
              <option value="vr_demo">VR Demo/Training</option>
              <option value="residence_hall">Residence Hall Event</option>
              <option value="student_org">Student Organization</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select unit...</option>
              {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select room...</option>
              {ROOMS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Cables Needed</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={needsHDMI}
                onChange={(e) => setNeedsHDMI(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">HDMI</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={needsEthernet}
                onChange={(e) => setNeedsEthernet(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Ethernet</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={needsUSB}
                onChange={(e) => setNeedsUSB(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div>
                <span className="text-sm text-gray-700">USB</span>
                <span className="text-xs text-gray-400 block">PS4/PS5 only</span>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={needsPower}
                onChange={(e) => setNeedsPower(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Power</span>
            </label>
          </div>
        </div>

        <button
          onClick={checkAvailability}
          disabled={!controllers || !startDate}
          className="mt-6 w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Checking Availability...
            </>
          ) : (
            <>
              Check Availability
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-4">
        {/* AI Recommendation */}
        {aiSuggestion && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="text-purple-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900">AI Recommendation: {aiSuggestion.recommendedType}</h4>
                <p className="text-sm text-purple-700 mt-1">{aiSuggestion.reason}</p>
              </div>
            </div>
          </div>
        )}

        {availableSystems.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gamepad2 className="text-gray-600" size={20} />
              Available Systems ({availableSystems.length})
            </h3>

            <div className="grid gap-3">
              {availableSystems.map((system) => {
                const isRecommended = system.type === aiSuggestion?.recommendedType;
                const SystemIcon = system.type.includes('Quest') || system.type.includes('Oculus') ? Monitor : Gamepad2;

                return (
                  <div
                    key={system.id}
                    onClick={() => setSelectedSystem(system)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSystem?.id === system.id
                        ? 'border-purple-500 bg-purple-50'
                        : isRecommended
                          ? 'border-green-300 bg-green-50 hover:border-green-400'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <SystemIcon size={24} className="text-gray-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{system.name}</span>
                            {isRecommended && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Recommended</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Users size={14} /> {system.controllers} controllers
                            </span>
                            <span>{system.type}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Cables: {[
                              system.cables.hdmi && 'HDMI',
                              system.cables.ethernet && 'Ethernet',
                              system.cables.usb && 'USB',
                              system.cables.power && 'Power'
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-mono">{system.serialNumber}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setFormStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setFormStep(3)}
                disabled={!selectedSystem}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue to Review
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <XCircle className="mx-auto text-red-400 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-gray-900">No Systems Available</h3>
            <p className="text-gray-500 mt-1">No systems match your requirements for the selected dates.</p>
            <button
              onClick={() => setFormStep(1)}
              className="mt-4 px-6 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200"
            >
              Modify Request
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    if (!selectedSystem) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-500" size={20} />
          Review & Confirm Your Checkout
        </h3>

        {flags.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-orange-500 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-orange-800">This request will require admin review</p>
              <p className="text-xs text-orange-600 mt-1">{flags.join(' • ')}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">System</span>
              <p className="font-medium">{selectedSystem.name}</p>
              <p className="text-sm text-gray-500">{selectedSystem.type}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Serial Number</span>
              <p className="font-medium font-mono">{selectedSystem.serialNumber}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Dates</span>
              <p className="font-medium">
                {new Date(startDate).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                {endDate && ` - ${new Date(endDate).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}`}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Unit</span>
              <p className="font-medium">{unit || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Room</span>
              <p className="font-medium">{room || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Controllers</span>
              <p className="font-medium">{selectedSystem.controllers} included</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Cables Included</span>
              <p className="font-medium">{[
                selectedSystem.cables.hdmi && 'HDMI',
                selectedSystem.cables.ethernet && 'Ethernet',
                selectedSystem.cables.usb && 'USB',
                selectedSystem.cables.power && 'Power'
              ].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setFormStep(2)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={submitRequest}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Confirm Checkout Request
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-500" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Request Submitted!</h3>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          Your checkout request has been submitted. Check your email for next steps or view it in "My Checkouts".
        </p>
        <button
          onClick={resetForm}
          className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  function renderMyCheckoutsTab() {
    const activeCheckouts = userRequests.filter(r => r.status === 'checked_out');
    const pendingCheckouts = userRequests.filter(r => ['pending_confirmation', 'pending_review', 'confirmed'].includes(r.status));
    const completedCheckouts = userRequests.filter(r => ['returned', 'rejected'].includes(r.status));

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">My Checkouts</h3>

        {/* Active Checkouts */}
        {activeCheckouts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="text-green-500" size={18} />
              Active Checkouts ({activeCheckouts.length})
            </h4>
            <div className="space-y-3">
              {activeCheckouts.map((request) => (
                <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{request.systemName}</p>
                      <p className="text-sm text-gray-500">{request.unit} / Room {request.room}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReturnRequest(request.id)}
                      disabled={request.status === 'pending_return'}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {request.status === 'pending_return' ? 'Return Pending' : 'Request Return'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingCheckouts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="text-yellow-500" size={18} />
              Pending Requests ({pendingCheckouts.length})
            </h4>
            <div className="space-y-3">
              {pendingCheckouts.map((request) => (
                <div key={request.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="font-medium">{request.systemName}</p>
                    <p className="text-sm text-gray-500">{request.unit} / Room {request.room}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Checkouts */}
        {completedCheckouts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="text-gray-500" size={18} />
              History ({completedCheckouts.length})
            </h4>
            <div className="space-y-2">
              {completedCheckouts.slice(0, 10).map((request) => (
                <div key={request.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{request.systemName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(request.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {userRequests.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <h3 className="text-lg font-semibold text-gray-900">No Checkouts Yet</h3>
            <p className="text-gray-500 mt-1">Submit a request to get started!</p>
            <button
              onClick={() => setActiveTab('request')}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              New Request
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderAdminTab() {
    const pendingReturns = requests.filter(r => r.status === 'pending_return');
    const checkedOut = requests.filter(r => r.status === 'checked_out');
    const overdueReturns = checkedOut.filter(r => {
      const checkedOutDate = new Date(r.checkedOutAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return checkedOutDate <= sevenDaysAgo;
    });
    const returnHistory = requests.filter(r => r.status === 'returned').slice(0, 20);

    return (
      <div className="space-y-6">
        {/* Admin Sub-tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setAdminSubTab('requests')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              adminSubTab === 'requests'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Request Queue
            {requests.filter(r => r.flagged && ['pending_review', 'pending_confirmation'].includes(r.status)).length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                {requests.filter(r => r.flagged && ['pending_review', 'pending_confirmation'].includes(r.status)).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminSubTab('returns')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              adminSubTab === 'returns'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Returns Management
            {pendingReturns.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                {pendingReturns.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminSubTab('inventory')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              adminSubTab === 'inventory'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            System Inventory
            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
              {systems.length}
            </span>
          </button>
          <button
            onClick={() => setAdminSubTab('users')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              adminSubTab === 'users'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            User Management
            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
              {users.length}
            </span>
          </button>
        </div>

        {/* Requests Sub-tab */}
        {adminSubTab === 'requests' && renderAdminRequests()}

        {/* Returns Management Sub-tab */}
        {adminSubTab === 'returns' && renderReturnsManagement(pendingReturns, checkedOut, overdueReturns, returnHistory)}

        {/* Inventory Sub-tab */}
        {adminSubTab === 'inventory' && renderInventoryManagement()}

        {/* User Management Sub-tab */}
        {adminSubTab === 'users' && renderUserManagement()}
      </div>
    );
  }

  function renderAdminRequests() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Request Queue</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requestor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit / Room</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.filter(r => !['returned'].includes(r.status)).map((req) => (
                <tr key={req.id} className={req.flagged ? 'bg-orange-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {req.flagged && <AlertTriangle className="text-orange-500" size={16} />}
                      <span className="font-mono text-sm">{req.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{req.userName}</p>
                      <p className="text-xs text-gray-500">{req.userDepartment}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{req.systemName}</td>
                  <td className="px-4 py-3 text-sm">{req.unit} / {req.room}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(req.startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                    {req.endDate !== req.startDate && ` - ${new Date(req.endDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3">
                    {(req.status === 'pending_review' || req.status === 'pending_confirmation') && (
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            await requestsService.updateRequestStatus(req.id, 'confirmed');
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          title="Approve"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            await requestsService.updateRequestStatus(req.id, 'rejected');
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                    {req.status === 'confirmed' && (
                      <button
                        onClick={async () => {
                          await requestsService.updateRequestStatus(req.id, 'checked_out', req.systemId);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <Send size={14} /> Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requests.filter(r => r.flagged && ['pending_review', 'pending_confirmation'].includes(r.status)).length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h4 className="font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle size={18} />
              Flagged Requests Requiring Review ({requests.filter(r => r.flagged && ['pending_review', 'pending_confirmation'].includes(r.status)).length})
            </h4>
            <div className="mt-2 space-y-2">
              {requests.filter(r => r.flagged && ['pending_review', 'pending_confirmation'].includes(r.status)).map(req => (
                <div key={req.id} className="flex justify-between items-center text-sm">
                  <span>{req.id} - {req.userName}</span>
                  <span className="text-orange-600">{req.flagReason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderReturnsManagement(pendingReturns, checkedOut, overdueReturns, returnHistory) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Returns Management</h3>

        {/* Pending Returns */}
        {pendingReturns.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2 text-purple-700">
              <AlertTriangle size={18} />
              Pending Returns ({pendingReturns.length})
            </h4>
            <div className="space-y-3">
              {pendingReturns.map((request) => (
                <div key={request.id} className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{request.systemName}</p>
                      <p className="text-sm text-gray-600">{request.userName} - {request.userDepartment}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Checked out: {new Date(request.checkedOutAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmReturn(request.id, request.systemId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    >
                      Confirm Return
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently Checked Out */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Package size={18} />
            Currently Checked Out ({checkedOut.length})
          </h4>
          {checkedOut.length > 0 ? (
            <div className="space-y-2">
              {checkedOut.map((request) => (
                <div key={request.id} className="p-3 border border-gray-200 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{request.systemName}</p>
                    <p className="text-xs text-gray-500">{request.userName} - {request.unit} / Room {request.room}</p>
                    <p className="text-xs text-gray-400">Checked out: {new Date(request.checkedOutAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleConfirmReturn(request.id, request.systemId)}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                  >
                    Mark as Returned
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No systems currently checked out</p>
          )}
        </div>

        {/* Overdue Returns */}
        {overdueReturns.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle size={18} />
              Overdue Returns (7+ days) ({overdueReturns.length})
            </h4>
            <div className="mt-2 space-y-2">
              {overdueReturns.map(req => {
                const daysOverdue = Math.floor((new Date() - new Date(req.checkedOutAt)) / (1000 * 60 * 60 * 24));
                return (
                  <div key={req.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{req.systemName}</span>
                      <span className="text-gray-600 ml-2">- {req.userName}</span>
                    </div>
                    <span className="text-red-700">{daysOverdue} days overdue</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Return History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="text-gray-500" size={18} />
            Return History ({returnHistory.length})
          </h4>
          {returnHistory.length > 0 ? (
            <div className="space-y-2">
              {returnHistory.map((request) => (
                <div key={request.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{request.systemName}</p>
                    <p className="text-xs text-gray-500">{request.userName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Returned: {new Date(request.returnedAt).toLocaleDateString()}</p>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No return history yet</p>
          )}
        </div>
      </div>
    );
  }

  function renderInventoryManagement() {
    // Calculate maintenance alerts
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

    const upcomingResets = systems.filter(s => {
      if (!s.systemReset) return false;
      const resetDate = new Date(s.systemReset);
      return resetDate <= thirtyDaysFromNow && resetDate >= today;
    });

    const overdueMaintenance = systems.filter(s => {
      if (!s.lastMaintenance) return false;
      const maintDate = new Date(s.lastMaintenance);
      return maintDate <= sixtyDaysAgo;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">System Inventory</h3>
          <button
            onClick={() => {
              setEditingSystem({
                name: '',
                type: 'Xbox Cart',
                controllers: 2,
                serialNumber: '',
                cables: { hdmi: true, ethernet: false, usb: false, power: true },
                available: true,
                systemReset: '',
                lastMaintenance: '',
                storageLocation: '',
                isNew: true
              });
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <span>+</span> Add System
          </button>
        </div>

        {/* Maintenance Alerts */}
        {(upcomingResets.length > 0 || overdueMaintenance.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingResets.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Upcoming System Resets ({upcomingResets.length})
                </h4>
                <p className="text-xs text-yellow-700 mt-1 mb-2">Systems requiring data reset within 30 days</p>
                <div className="mt-2 space-y-1">
                  {upcomingResets.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-yellow-700">{new Date(s.systemReset).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {overdueMaintenance.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Overdue Maintenance ({overdueMaintenance.length})
                </h4>
                <p className="text-xs text-red-700 mt-1 mb-2">Systems not maintained in 60+ days</p>
                <div className="mt-2 space-y-1">
                  {overdueMaintenance.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-red-700">Last: {new Date(s.lastMaintenance).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit/Add System Modal */}
        {editingSystem && renderSystemModal()}

        {/* Systems Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Controllers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cables</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Reset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Maint.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {systems.map((system) => {
                const SystemIcon = system.type.includes('Quest') || system.type.includes('Oculus') ? Monitor : Gamepad2;

                // Calculate maintenance status
                const today = new Date();
                const resetDate = system.systemReset ? new Date(system.systemReset) : null;
                const maintDate = system.lastMaintenance ? new Date(system.lastMaintenance) : null;
                const resetSoon = resetDate && resetDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) && resetDate >= today;
                const resetOverdue = resetDate && resetDate < today;
                const maintOverdue = maintDate && maintDate <= new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

                return (
                  <tr key={system.id} className={!system.available ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <SystemIcon size={18} className="text-gray-500" />
                        <span className="font-medium text-sm">{system.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{system.type}</td>
                    <td className="px-4 py-3 text-sm font-mono">{system.serialNumber}</td>
                    <td className="px-4 py-3 text-sm">{system.storageLocation || '-'}</td>
                    <td className="px-4 py-3 text-sm">{system.controllers}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {system.cables.hdmi && <span className="px-1.5 py-0.5 bg-gray-100 rounded">HDMI</span>}
                        {system.cables.ethernet && <span className="px-1.5 py-0.5 bg-gray-100 rounded">ETH</span>}
                        {system.cables.usb && <span className="px-1.5 py-0.5 bg-gray-100 rounded">USB</span>}
                        {system.cables.power && <span className="px-1.5 py-0.5 bg-gray-100 rounded">PWR</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {resetDate ? (
                        <span className={`${resetOverdue ? 'text-red-600 font-medium' : resetSoon ? 'text-yellow-600 font-medium' : ''}`}>
                          {resetDate.toLocaleDateString()}
                          {resetOverdue && <span className="ml-1 text-xs block">(Overdue!)</span>}
                          {resetSoon && !resetOverdue && <span className="ml-1 text-xs block">(Soon)</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {maintDate ? (
                        <span className={maintOverdue ? 'text-red-600 font-medium' : ''}>
                          {maintDate.toLocaleDateString()}
                          {maintOverdue && <span className="ml-1 text-xs block">(Due)</span>}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={async () => {
                          await systemsService.setAvailability(system.id, !system.available);
                        }}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          system.available
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {system.available ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingSystem({...system})}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                          title="Edit"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete ${system.name}?`)) {
                              await systemsService.deleteSystem(system.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inventory Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{systems.length}</p>
            <p className="text-xs text-gray-500">Total Systems</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{systems.filter(s => s.available).length}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{systems.filter(s => !s.available).length}</p>
            <p className="text-xs text-gray-500">Checked Out</p>
          </div>
        </div>
      </div>
    );
  }

  function renderSystemModal() {
    if (!editingSystem) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingSystem.isNew ? 'Add New System' : 'Edit System'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">System Name</label>
              <input
                type="text"
                value={editingSystem.name}
                onChange={(e) => setEditingSystem({...editingSystem, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., PS5 Cart #1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={editingSystem.type}
                onChange={(e) => setEditingSystem({...editingSystem, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <optgroup label="Xbox">
                  <option value="Xbox Cart">Xbox Cart</option>
                  <option value="Xbox Bag System">Xbox Bag System</option>
                </optgroup>
                <optgroup label="PlayStation">
                  <option value="PS4 Bag System">PS4 Bag System</option>
                  <option value="PS5 Cart">PS5 Cart</option>
                  <option value="PS5 Bag System">PS5 Bag System</option>
                </optgroup>
                <optgroup label="Nintendo">
                  <option value="Switch">Switch</option>
                </optgroup>
                <optgroup label="VR">
                  <option value="Oculus Quest 2">Oculus Quest 2</option>
                  <option value="Meta Quest Pro">Meta Quest Pro</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Controllers</label>
              <input
                type="number"
                min="1"
                max="8"
                value={editingSystem.controllers}
                onChange={(e) => setEditingSystem({...editingSystem, controllers: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input
                type="text"
                value={editingSystem.serialNumber}
                onChange={(e) => setEditingSystem({...editingSystem, serialNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., PS5C-2024-0001"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
              <input
                type="text"
                value={editingSystem.storageLocation || ''}
                onChange={(e) => setEditingSystem({...editingSystem, storageLocation: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Cabinet A-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Reset Date
                <span className="text-xs text-gray-500 block font-normal">For patient data removal</span>
              </label>
              <input
                type="date"
                value={editingSystem.systemReset || ''}
                onChange={(e) => setEditingSystem({...editingSystem, systemReset: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Maintenance
                <span className="text-xs text-gray-500 block font-normal">Service/inspection date</span>
              </label>
              <input
                type="date"
                value={editingSystem.lastMaintenance || ''}
                onChange={(e) => setEditingSystem({...editingSystem, lastMaintenance: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cables Included</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSystem.cables.hdmi}
                    onChange={(e) => setEditingSystem({...editingSystem, cables: {...editingSystem.cables, hdmi: e.target.checked}})}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">HDMI</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSystem.cables.ethernet}
                    onChange={(e) => setEditingSystem({...editingSystem, cables: {...editingSystem.cables, ethernet: e.target.checked}})}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Ethernet</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSystem.cables.usb}
                    onChange={(e) => setEditingSystem({...editingSystem, cables: {...editingSystem.cables, usb: e.target.checked}})}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">USB (PS4/PS5)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSystem.cables.power}
                    onChange={(e) => setEditingSystem({...editingSystem, cables: {...editingSystem.cables, power: e.target.checked}})}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm">Power</span>
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSystem.available}
                  onChange={(e) => setEditingSystem({...editingSystem, available: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Available for checkout</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setEditingSystem(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  if (editingSystem.isNew) {
                    const { isNew, ...newSystem } = editingSystem;
                    await systemsService.createSystem(newSystem);
                  } else {
                    const { id, ...systemData } = editingSystem;
                    await systemsService.updateSystem(id, systemData);
                  }
                  setEditingSystem(null);
                } catch (error) {
                  console.error('Error saving system:', error);
                  alert('Failed to save system. Please try again.');
                }
              }}
              disabled={!editingSystem.name}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
            >
              {editingSystem.isNew ? 'Add System' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAnalyticsTab() {
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'returned').length;
    const activeRequests = requests.filter(r => r.status === 'checked_out').length;
    const pendingRequests = requests.filter(r => ['pending_confirmation', 'pending_review', 'confirmed'].includes(r.status)).length;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Analytics Dashboard</h3>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Gamepad2 className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRequests}</p>
                <p className="text-xs text-gray-500">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedRequests}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRequests}</p>
                <p className="text-xs text-gray-500">Active Checkouts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold mb-4">System Utilization</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Available Systems</span>
              <span className="font-medium">{systems.filter(s => s.available).length} / {systems.length}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(systems.filter(s => s.available).length / systems.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Popular Systems */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold mb-4">Most Requested Systems</h4>
          <div className="space-y-3">
            {Object.entries(
              requests.reduce((acc, req) => {
                acc[req.systemName] = (acc[req.systemName] || 0) + 1;
                return acc;
              }, {})
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([systemName, count]) => (
                <div key={systemName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{systemName}</span>
                    <span className="font-medium">{count} requests</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(count / totalRequests) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  function renderUserManagement() {
    // Get unique departments from users
    const departments = ['all', ...new Set(users.map(u => u.department).filter(Boolean))];

    // Filter users
    const filteredUsers = users.filter(user => {
      const matchesSearch = userSearchTerm === '' ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase());

      const matchesDepartment = userDepartmentFilter === 'all' || user.department === userDepartmentFilter;
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;

      return matchesSearch && matchesDepartment && matchesRole;
    });

    const handleToggleRole = async (userId, currentRole) => {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      if (userId === currentUser.uid) {
        alert("You cannot change your own role!");
        return;
      }
      try {
        await usersService.updateUserRole(userId, newRole);
      } catch (error) {
        console.error('Error updating user role:', error);
        alert('Failed to update user role');
      }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
      if (userId === currentUser.uid) {
        alert("You cannot disable your own account!");
        return;
      }
      try {
        await usersService.toggleUserStatus(userId, !currentStatus);
      } catch (error) {
        console.error('Error updating user status:', error);
        alert('Failed to update user status');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">User Management</h3>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={userDepartmentFilter}
                onChange={(e) => setUserDepartmentFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="relative">
              <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={user.id === currentUser.uid ? 'bg-purple-50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-medium text-sm">
                          {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-sm">{user.displayName || 'No name'}</span>
                      {user.id === currentUser.uid && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{user.department || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleRole(user.id, user.role)}
                      disabled={user.id === currentUser.uid}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${user.id === currentUser.uid ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.isActive !== false)}
                      disabled={user.id === currentUser.uid}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive !== false
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } ${user.id === currentUser.uid ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {user.isActive !== false ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleRole(user.id, user.role)}
                        disabled={user.id === currentUser.uid}
                        className={`text-xs px-2 py-1 rounded ${
                          user.id === currentUser.uid
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                        title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                      >
                        {user.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-xs text-gray-500">Total Users</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-xs text-gray-500">Admins</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'user').length}</p>
            <p className="text-xs text-gray-500">Regular Users</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isActive !== false).length}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
        </div>
      </div>
    );
  }
}
