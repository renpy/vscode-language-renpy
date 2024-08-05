define e = Character('Sylvie', color="#000080")

label sample1:
    "Here is 'sample1' label."

label sample2(a="default"):
    "Here is 'sample2' label."
    "a = [a]"

label global_label:
    "Inside a global label.."
    label .local_name:
        "..resides a local one."
        jump .local_name
    
    label local:
    label .local:
        
    label global_name.local:
    label global_label.local_name.error:
    label .global_label.local_name.error:
        pass