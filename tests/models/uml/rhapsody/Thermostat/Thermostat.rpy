I-Logix-RPY-Archive version 8.7.1 C++ 5093211
{ IProject 
	- _id = GUID 7a000000-0000-4000-8000-000000000001;
	- _myState = 8192;
	- _properties = { IPropertyContainer 
		- Subjects = { IRPYRawContainer 
			- size = 1;
			- value = 
			{ IPropertySubject 
				- _Name = "General";
				- Metaclasses = { IRPYRawContainer 
					- size = 0;
				}
			}
		}
	}
	- _name = "Thermostat";
	- _lastID = 3;
	- _defaultSubsystem = { ISubsystemHandle 
		- _m2Class = "ISubsystem";
		- _filename = "Architecture.sbs";
		- _subsystem = "";
		- _class = "";
		- _name = "Architecture";
		- _id = GUID 7a000000-0000-4000-8000-000000000020;
	}
	- Subsystems = { IRPYRawContainer 
		- size = 3;
		- value = 
		{ ISubsystem 
			- fileName = "Exigences";
			- _id = GUID 7a000000-0000-4000-8000-000000000010;
		}
		{ ISubsystem 
			- fileName = "Architecture";
			- _id = GUID 7a000000-0000-4000-8000-000000000020;
		}
		{ IProfile 
			- fileName = "CompatibiliteCpp";
			- _id = GUID 7a000000-0000-4000-8000-000000000090;
		}
	}
	- Diagrams = { IRPYRawContainer 
		- size = 0;
	}
	- Components = { IRPYRawContainer 
		- size = 1;
		- value = 
		{ IComponent 
			- fileName = "Executable";
			- _id = GUID 7a000000-0000-4000-8000-000000000095;
		}
	}
}

