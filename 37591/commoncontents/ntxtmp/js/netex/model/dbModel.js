Ntxtmp.Model.DbModel = Backbone.Model.extend({
    defaults: {
        db: null,
        name: 'PPV3_' + Ntxtmp.CourseId,
        version: 1,
        storeName: 'attachments',
        empty: true,
        attachmentData: null
    },
    requiredFeaturesSupported: function ($fileInput) {
        if (!$fileInput.get(0).files) {
//            Ntxtmp.Singleton.DialogModel.set({
//                html : $('#attachment-not-supported-dialog-template').text(),
//                customHtml : 'FileApi not suported'
//            });
            return false;
        }

        if (!window.indexedDB) {
            if (window.mozIndexedDB) {
                window.indexedDB = window.mozIndexedDB;
            }
            else if (window.webkitIndexedDB) {
                window.indexedDB = webkitIndexedDB;
                IDBCursor = webkitIDBCursor;
                IDBDatabaseException = webkitIDBDatabaseException;
                IDBRequest = webkitIDBRequest;
                IDBKeyRange = webkitIDBKeyRange;
                IDBTransaction = webkitIDBTransaction;
            }
            else {
//                Ntxtmp.Singleton.DialogModel.set({
//                    html : $('#attachment-not-supported-dialog-template').text(),
//                    customHtml : 'Upgrade your browser'
//                });
                return false;
            }
        } 

        return true;
    },
    openDB: function () {

        if (!window.indexedDB.open) {
                /*Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'Can\'t open DB'
                });*/
            Ntxtmp.Singleton.HeaderView.desactiveAttachments();
            return;
        } 

        try {
            var openRequest = window.indexedDB.open(Ntxtmp.Singleton.DbModel.get('name'), Ntxtmp.Singleton.DbModel.get('version')); // Also passing an optional version number for this database.

            openRequest.onerror = function (evt) {
                
                /*Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'DB request error'
                });*/
                Ntxtmp.Singleton.HeaderView.desactiveAttachments();
//                console.log("openRequest.onerror fired in openDB() - error: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
            };
            openRequest.onblocked = Ntxtmp.Singleton.DbModel.openDB_onblocked; // Called if the database is opened via another process, or similar.
            openRequest.onupgradeneeded = Ntxtmp.Singleton.DbModel.openDB_onupgradeneeded; // Called if the database doesn't exist or the database version values don't match.
            openRequest.onsuccess = Ntxtmp.Singleton.DbModel.openDB_onsuccess; // Attempts to open an existing database (that has a correctly matching version value).        
        }
        catch (ex) {
            /*Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB request exception'
            });*/
            Ntxtmp.Singleton.HeaderView.desactiveAttachments();
//            console.log(" ### - " + ex.message);
        }

    },
    openDB_onblocked: function (evt) {
       /* Ntxtmp.Singleton.DialogModel.set({
            html : $('#attachment-database-error-dialog-template').text(),
            customHtml : 'DB is blocked, please restart the browser'
        });*/


//        var message = "<p>The database is blocked - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode) + "</p>";
    },
    openDB_onupgradeneeded: function (evt) {

        Ntxtmp.Singleton.DbModel.set('db', evt.target.result); // A successfully opened database results in a database object, which we place in our global IndexedDB variable.
        var db = evt.target.result; // A successfully opened database results in a database object, which we place in our global IndexedDB variable.

        if (!db) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB version upgrade needed'
            });
            return;
        }

        try {
            db.createObjectStore(Ntxtmp.Singleton.DbModel.get('storeName'), {keyPath: "ID", autoIncrement: true}); // Create the object store such that each object in the store will be given an "ID" property that is auto-incremented monotonically. Thus, files of the same name can be stored in the database.
        }
        catch (ex) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB version upgrade exception'
            });
            return;
        }
    },
    openDB_onsuccess: function (evt) {

        Ntxtmp.Singleton.DbModel.set('db', evt.target.result); // A successfully opened database results in a database object, which we place in our global IndexedDB variable.
        var db = evt.target.result; // A successfully opened database results in a database object, which we place in our global IndexedDB variable.

        if (!db) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB access error'
            });
            return;
        }
    },
    handleFileSelection: function (evt) {

        var files = evt.target.files; // The files selected by the user (as a FileList object).
        if (!files || !files[0]) {
            // no se ha seleccionado archivo
            return;
        }
        
        var file = files[0],
            reader = new FileReader();

        if (parseInt(file.size) > 1024*1224*1.5 ){
            Ntxtmp.Singleton.DialogModel.set('html' , $('#attachment-file-size-exceded-dialog-template').text());
            return;
        }
            
        reader.onload = function (e) {
            var db = Ntxtmp.Singleton.DbModel.get('db');
            if (!db) {
                /*Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'DB access error'
                });*/
                Ntxtmp.Singleton.HeaderView.desactiveAttachments();
                return;
            } 

            try {
                var transaction = db.transaction(Ntxtmp.Singleton.DbModel.get('storeName'), (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
            } // try
            catch (ex) {
//                console.log("db.transaction exception in handleFileSelection() - " + ex.message);
                /*Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'DB exception'
                });
                return;*/
                Ntxtmp.Singleton.HeaderView.desactiveAttachments();
            } // catch            
            try {
                var objectStore = transaction.objectStore(Ntxtmp.Singleton.DbModel.get('storeName'));
                var putRequest = objectStore.add({data:e.target.result});
                putRequest.onsuccess = function (e) {

                    Ntxtmp.Singleton.DbModel.set('empty', false);
                    var id = _.uniqueId('attachment_');
                    while( Ntxtmp.Singleton.AttachmentCollection.getById(id)){
                        id = _.uniqueId('attachment_');
                    }
                    
                    Ntxtmp.Singleton.AttachmentCollection.addAttachment({
                        id: id,
                        book: Ntxtmp.Singleton.RouterModel.get('book'),
                        page: Ntxtmp.Singleton.RouterModel.get('page'),
                        dbKey: e.target.result,
                        top: $('#attachment-upload').data('top'),
                        left: $('#attachment-upload').data('left')
                    });
                };
                putRequest.onerror = function (evt) {
                    Ntxtmp.Singleton.DialogModel.set({
                        html : $('#attachment-database-error-dialog-template').text(),
                        customHtml : 'DB putRequest error'
                    });
                    return;
                };
            } catch (ex) {
                Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'DB putRequest exception'
                });
                return;
            }
        };
        reader.readAsDataURL(file);
    },
    getAttachment: function (attachment_id) {
        var db = Ntxtmp.Singleton.DbModel.get('db');

        if (!db) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB access error'
            });
            return;
        }

        try {
            var transaction = db.transaction(Ntxtmp.Singleton.DbModel.get('storeName'), (IDBTransaction.READ_ONLY ? IDBTransaction.READ_ONLY : 'readonly'));
        } // try
        catch (ex) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB transactoin exception'
            });

            return;
        } // catch

        try {
            var objectStore = transaction.objectStore(Ntxtmp.Singleton.DbModel.get('storeName'));
            try {
                var request = objectStore.get(attachment_id);
                request.onerror = Ntxtmp.Singleton.DbModel.getAttachment_onerror;
                request.onsuccess = Ntxtmp.Singleton.DbModel.getAttachment_onsuccess;
            } // inner try
            catch (innerException) {
                Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : 'DB request exception ' + innerException.message
                });                
            } 
        } 
        catch (outerException) {
             Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB objStore exception'
            });    
        } // outer catch
    },
    getAttachment_onerror: function (evt) {
         Ntxtmp.Singleton.DialogModel.set({
            html : $('#attachment-database-error-dialog-template').text(),
            customHtml : 'DB getAttachment exception'
        });    
//        console.log("cursorRequest.onerror fired in displayDB() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
    },
    getAttachment_onsuccess: function (evt) {

        var result = evt.target.result;
        if (result) {
            Ntxtmp.Singleton.DbModel.set('empty', false); 
            Ntxtmp.Singleton.DbModel.set('attachmentData' , result.data);
        }else {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'No attachment found'
            });    
        }
    },
    removeAttachment: function (attachment_id) {

        var db = Ntxtmp.Singleton.DbModel.get('db');
        if (!db) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB access error'
            });
            return;
        } 

        try {
            var transaction = db.transaction(Ntxtmp.Singleton.DbModel.get('storeName'), (IDBTransaction.READ_ONLY ? IDBTransaction.READ_WRITE : 'readwrite'));
        }
        catch (ex) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB transaction exception'
            });
            return;
        }

        try {
            var objectStore = transaction.objectStore(Ntxtmp.Singleton.DbModel.get('storeName'));
            try {
                var request = objectStore.delete(attachment_id);
            }
            catch (innerException) {
                Ntxtmp.Singleton.DialogModel.set({
                    html : $('#attachment-database-error-dialog-template').text(),
                    customHtml : innerException.message
                });
            }
        }
        catch (outerException) {
            Ntxtmp.Singleton.DialogModel.set({
                html : $('#attachment-database-error-dialog-template').text(),
                customHtml : 'DB objStore exception'
            });
        }
    }    
});
