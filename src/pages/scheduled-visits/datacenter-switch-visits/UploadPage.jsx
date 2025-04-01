import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, AlertCircle, FileText, Save, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { storage, auth, db } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDoc, 
  getDocs,
  deleteDoc, 
  doc, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { PDFReader } from '@/utils/pdfReader';

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    requestNumber: '',
    requestedFor: '',
    updatedToOpen: '',
    shortDescription: '',
    description: '',
    workNotes: '',
    accessStartDate: '',
    accessEndDate: '',
    state: '',
    approvals: [] 
  });

  // Handle file drop
  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      await processFile(droppedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile?.type === 'application/pdf') {
      await processFile(selectedFile);
    } else {
      setError('Please upload a PDF file');
    }
  };

  // Add this function to test database connection
const testDatabaseConnection = async () => {
  try {
    // Try to write a test document to requests collection
    const testData = {
      userId: auth.currentUser.uid,
      test: true,
      timestamp: new Date().toISOString()
    };

        const testDoc = await addDoc(collection(db, 'requests'), testData);
    console.log('Test write successful');
    
    // Try to read it back
    const docSnap = await getDoc(doc(db, 'requests', testDoc.id));
    console.log('Test read successful');
    
    // Delete the test document
    await deleteDoc(doc(db, 'requests', testDoc.id));
    console.log('Test delete successful');
    
    console.log('Database connection successful!');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

  // Process PDF file
const processFile = async (file) => {
  setLoading(true);
  setError(null);
try {
    const text = await PDFReader.readPDF(file);
    console.log("Starting approval extraction");

    const approvals = [];
    // Basic pattern for finding Approved entries
    const approvalPattern = /Approved\s+([^\d]+?)\s+((?:Data|Switch|Access)[^\d]+?)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g;

    let foundApprovals = [];
    let match;

    // Find all matches first
    while ((match = approvalPattern.exec(text)) !== null) {
        // Skip if it contains header text
        if (!match[1].includes('State') && !match[1].includes('Comments')) {
            foundApprovals.push({
                state: 'Approved',
                approver: match[1].trim(),
                item: match[2].trim(),
                created: match[3],
                createdOriginal: match[4]
            });
        }
    }

    // Take first two valid approvals found
    approvals.push(...foundApprovals.slice(0, 2));

    console.log("Final approvals:", approvals);
      
      
      const data = {
        requestNumber: text.match(/Number:\s*(RITM\d+)/)?.[1] || '',
        requestedFor: text.match(/Request Requested for:\s*(.*?)\s*Company:/s)?.[1]?.trim() || '',
        updatedToOpen: text.match(/Opened:\s*(.*?)\s*Closed:/s)?.[1]?.trim() || '',
        shortDescription: text.match(/Short description:\s*(.*?)\s*Description:/s)?.[1]?.trim() || '',
        description: text.match(/Description:\s*(.*?)\s*Approver:/s)?.[1]?.trim() || '',
        workNotes: text.match(/Work notes:\s*(.*?)\s*Additional comments:/s)?.[1]?.trim() || '',
        state: text.match(/State:\s*(.*?)\s*Priority:/s)?.[1]?.trim() || '',
        approvals
 
      };

    setExtractedData(data);
    setFormData(data);
  } catch (error) {
    console.error('Error in processFile:', error);
    setError('Failed to process PDF file');
  } finally {
    setLoading(false);
  }
};

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
const handleSubmit = async () => {
  setLoading(true);
  setError(null);

  try {
    // Test database connection first
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      throw new Error('Unable to connect to database');
    }

    // Check if we have any data to save
    if (!formData.requestNumber) {
      throw new Error('No request data to save');
    }

        let fileUrl = null;
    
    // Only try to upload if there's a file
    if (file) {
      // Upload PDF to Firebase Storage
      const storageRef = ref(storage, `pdfs/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    }

    // 2. Prepare data for Firestore
const requestData = {
  ...formData,
  fileUrl,
  fileName: file ? file.name : null,
  accessStartDate: formData.accessStartDate,
  accessEndDate: formData.accessEndDate,
  userId: auth.currentUser.uid,
  createdAt: new Date().toISOString(),
  status: 'pending',
  uploadedBy: auth.currentUser.email
};
delete requestData.workNotes;

    // 3. Save to Firestore
    const docRef = await addDoc(collection(db, 'requests'), requestData);
    
    console.log('Document saved with ID:', docRef.id);

    // Show success popup
alert('Request saved successfully!');
window.location.reload();

  } catch (error) {
    console.error('Error saving request:', error);
    alert(`Error: ${error.message}`);
    setError(error.message || 'Failed to save request');
  } finally {
    setLoading(false);
  }
};

  // Add a function to check if data exists in database
const checkExistingData = async () => {
  try {
    const q = query(
      collection(db, 'requests'),
      where('userId', '==', auth.currentUser.uid),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking existing data:', error);
    return false;
  }
};

  // Add useEffect to test database on component mount
useEffect(() => {
  const testConnection = async () => {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      console.log('Database connection ready');
      // Check if we can read data
      const hasData = await checkExistingData();
      console.log('Existing data found:', hasData);
    }
  };
  
  testConnection();
}, []);

  // Reset form
const handleReset = () => {
  setFile(null);
  setExtractedData(null);
  setFormData({
    requestNumber: '',
    requestedFor: '',
    updatedToOpen: '',
    shortDescription: '',
    description: '',
    workNotes: '',
    state: '',
    approvals: [] 
  });
};

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Access Request</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!extractedData ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <FileText className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">Click to upload or drag and drop PDF</span>
                <span className="text-sm text-gray-500">Only PDF files are supported</span>
              </label>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Number
                  </label>
                  <input
                    type="text"
                    name="requestNumber"
                    value={formData.requestNumber}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested For
                  </label>
                  <input
                    type="text"
                    name="requestedFor"
                    value={formData.requestedFor}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Updated To Open
                </label>
                <input
                  type="text"
                  name="updatedToOpen"
                  value={formData.updatedToOpen}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                />
              </div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Work Notes (View Only)
  </label>
  <textarea
    name="workNotes"
    value={formData.workNotes}
    readOnly
    rows={2}
    className="w-full rounded-md border-gray-300 bg-gray-50"
  />
</div>

<div className="grid grid-cols-2 gap-4 mt-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Access Start Date
    </label>
    <input
      type="date"
      name="accessStartDate"
      value={formData.accessStartDate}
      onChange={(e) => setFormData({ ...formData, accessStartDate: e.target.value })}
      className="w-full rounded-md border-gray-300"
      required
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Access End Date
    </label>
    <input
      type="date"
      name="accessEndDate"
      value={formData.accessEndDate}
      onChange={(e) => setFormData({ ...formData, accessEndDate: e.target.value })}
      className="w-full rounded-md border-gray-300"
      required
    />
  </div>
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#0A2647] focus:ring-[#0A2647]"
                />
              </div>

  <div className="mt-6">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Approvals
    </label>
    <div className="bg-gray-50 rounded-md p-4">
      <div className="grid grid-cols-4 gap-4 mb-2 text-sm font-medium text-gray-600">
        <div>State</div>
        <div>Approver</div>
        <div>Item</div>
        <div>Created</div>
      </div>
      {formData.approvals.map((approval, index) => (
        <div key={index} className="grid grid-cols-4 gap-4 text-sm border-t py-2">
          <div>
            <input
              type="text"
              value={approval.state}
              onChange={(e) => {
                const newApprovals = [...formData.approvals];
                newApprovals[index] = {
                  ...approval,
                  state: e.target.value
                };
                setFormData({
                  ...formData,
                  approvals: newApprovals
                });
              }}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-[#0A2647] focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="text"
              value={approval.approver}
              onChange={(e) => {
                const newApprovals = [...formData.approvals];
                newApprovals[index] = {
                  ...approval,
                  approver: e.target.value
                };
                setFormData({
                  ...formData,
                  approvals: newApprovals
                });
              }}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-[#0A2647] focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="text"
              value={approval.item}
              onChange={(e) => {
                const newApprovals = [...formData.approvals];
                newApprovals[index] = {
                  ...approval,
                  item: e.target.value
                };
                setFormData({
                  ...formData,
                  approvals: newApprovals
                });
              }}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-[#0A2647] focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="text"
              value={approval.created}
              onChange={(e) => {
                const newApprovals = [...formData.approvals];
                newApprovals[index] = {
                  ...approval,
                  created: e.target.value
                };
                setFormData({
                  ...formData,
                  approvals: newApprovals
                });
              }}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-[#0A2647] focus:border-transparent"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
              
              
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
                   onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#0A2647]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>

      );


};

export default UploadPage;